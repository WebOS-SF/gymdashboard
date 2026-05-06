"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ButtonSpinner } from "@/components/ui/button-spinner";
import { Client, Product, ProductSale } from "@/lib/types";
import { Check, Package, Search, ShoppingCart, Trash2, Plus, Minus, X } from "lucide-react";
import { toast } from "sonner";

interface SalesListProps {
  products: Product[];
  clients: Client[];
  sales: ProductSale[];
  onUpdateProduct: (product: Product) => void;
  onSaleRecorded: () => void;
}

const normalizeSearchValue = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const getClientMatchScore = (client: Client, term: string) => {
  const name = normalizeSearchValue(client.name || "");
  const dni = String(client.dni || "");

  if (!term) return 0;
  if (dni === term || name === term) return 100;
  if (dni.startsWith(term) || name.startsWith(term)) return 80;
  if (dni.includes(term) || name.includes(term)) return 60;

  return name.split(/\s+/).some((word) => word.startsWith(term)) ? 50 : 0;
};

const formatSaleDate = (value: string) =>
  new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

export function SalesList({
  products,
  clients,
  sales,
  onUpdateProduct,
  onSaleRecorded,
}: SalesListProps) {
  const [productSearch, setProductSearch] = useState("");
  const [isSelling, setIsSelling] = useState(false);
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null);
  const [saleClientDni, setSaleClientDni] = useState("");
  const [saleClientSearch, setSaleClientSearch] = useState("");
  const [isWalkInClient, setIsWalkInClient] = useState(false);
  const [saleQty, setSaleQty] = useState(1);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [isPendingPayment, setIsPendingPayment] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyDate, setHistoryDate] = useState("");
  const [pendingSalesIds, setPendingSalesIds] = useState<number[]>([]);
  const [todaySalesSearch, setTodaySalesSearch] = useState("");
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        toast.info(`${product.name} ya está en la lista`, {
          description: "Puedes ajustar la cantidad al momento de procesar la venta.",
        });
        return prev;
      }
      toast.success(`${product.name} añadido a la lista`);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: number, quantity: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxStock = item.product.stock;
          const newQty = Math.max(1, Math.min(quantity, maxStock));
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("gym_pending_sales");
      if (stored) {
        setPendingSalesIds(JSON.parse(stored));
      }
    } catch (e) { }
  }, []);

  const togglePendingPayment = (saleId: number) => {
    setPendingSalesIds(prev => {
      const isPending = prev.includes(saleId);
      const next = isPending ? prev.filter(id => id !== saleId) : [...prev, saleId];
      localStorage.setItem("gym_pending_sales", JSON.stringify(next));
      return next;
    });
  };

  const todayDateString = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const todaySales = useMemo(() => {
    return sales.filter(sale => {
      const d = new Date(sale.saleDate);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const matchesDate = ds === todayDateString;
      if (!matchesDate) return false;

      const term = normalizeSearchValue(todaySalesSearch);
      if (!term) return true;

      return (
        normalizeSearchValue(sale.product).includes(term) ||
        normalizeSearchValue(sale.client?.nameComplete || "").includes(term) ||
        String(sale.clientDni).includes(term)
      );
    });
  }, [sales, todayDateString, todaySalesSearch]);

  const historySales = useMemo(() => {
    if (!historyDate) return [];
    return sales.filter(sale => {
      const d = new Date(sale.saleDate);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return ds === historyDate;
    });
  }, [sales, historyDate]);

  const handleOpenHistory = () => {
    setHistoryDate(todayDateString);
    setIsHistoryOpen(true);
  };

  const filteredProducts = products.filter((product) => {
    const term = normalizeSearchValue(productSearch);
    return (
      normalizeSearchValue(product.name).includes(term) ||
      normalizeSearchValue(product.category).includes(term)
    );
  });

  const clientSuggestions = useMemo(() => {
    const term = normalizeSearchValue(saleClientSearch);

    if (!term || isWalkInClient) return [];

    return clients
      .map((client) => ({
        client,
        score: getClientMatchScore(client, term),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.client.name || "").localeCompare(b.client.name || "");
      })
      .slice(0, 5)
      .map(({ client }) => client);
  }, [clients, isWalkInClient, saleClientSearch]);

  const handleOpenSell = () => {
    if (cart.length === 0) return;
    setSaleClientDni("");
    setSaleClientSearch("");
    setIsWalkInClient(false);
    setIsPendingPayment(false);
    setIsSelling(true);
  };

  const handleConfirmSell = async () => {
    if (cart.length === 0 || isSubmittingSale) return;
    if (!isWalkInClient && !saleClientDni) return;

    setIsSubmittingSale(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity
          })),
          clientDni: isWalkInClient ? null : saleClientDni,
          isWalkInClient,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Error al crear la venta");
      }

      const payload = await res.json();

      // Update local products stock
      if (payload?.items) {
        payload.items.forEach((item: any) => {
          if (item.product) {
            onUpdateProduct(item.product);
          }
          if (isPendingPayment && item.sale?.id) {
            setPendingSalesIds(prev => {
              const next = [...prev, item.sale.id];
              localStorage.setItem("gym_pending_sales", JSON.stringify(next));
              return next;
            });
          }
        });
      }

      setIsSelling(false);
      setCart([]);
      setSaleClientDni("");
      setSaleClientSearch("");
      setIsWalkInClient(false);
      setIsPendingPayment(false);
      onSaleRecorded();
      toast.success("Venta registrada", {
        description: "El stock y las ventas se actualizaron correctamente.",
      });
    } catch (error) {
      console.error("Error registrando venta:", error);
      toast.error("No se pudo registrar la venta", {
        description:
          error instanceof Error ? error.message : "Inténtalo nuevamente.",
      });
    } finally {
      setIsSubmittingSale(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] xl:grid-cols-[minmax(0,1fr)_minmax(450px,550px)]">
      <Card className="rounded-2xl border-0 bg-card shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#26DE81] to-[#20c572] shadow-lg">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-foreground">Ventas</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Selecciona un producto para vender
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              {cart.length > 0 && (
                <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-primary/20 to-primary/5 pl-5 pr-2.5 py-2.5 border border-primary/30 shadow-2xl shadow-primary/10 animate-in fade-in slide-in-from-top-4 duration-500 backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute -inset-1 bg-primary/20 rounded-full blur animate-pulse" />
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                        <ShoppingCart className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-black text-primary tracking-[0.2em] leading-none">Venta en curso</span>
                        <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold bg-primary/20 text-primary border-0">
                          {cart.length}
                        </Badge>
                      </div>
                      <span className="text-lg font-black text-foreground leading-tight">
                        S/ {cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-l border-primary/20 pl-4 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCart([])}
                      className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all hover:rotate-12"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                    <Button
                      onClick={handleOpenSell}
                      className="h-10 px-6 text-sm font-black bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-[0_8px_16px_-6px_rgba(var(--primary),0.5)] transition-all hover:scale-105 active:scale-95 flex gap-2"
                    >
                      <span>Finalizar Venta</span>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="relative sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="h-10 rounded-xl border-0 bg-secondary/50 pl-9 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl bg-secondary/30">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Producto
                  </TableHead>
                  <TableHead className="hidden text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">
                    Categoría
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Precio
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Stock
                  </TableHead>
                  <TableHead className="text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Acción
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product, index) => (
                  <TableRow
                    key={product.id}
                    className={`border-0 transition-colors hover:bg-secondary/50 ${index % 2 === 0 ? "bg-card" : "bg-transparent"}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#5B8DEF] to-[#4a7de0] text-xs font-medium text-white">
                          {product.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">
                          {product.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className="rounded-lg border-border/50 font-normal text-foreground"
                      >
                        {product.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      S/ {product.price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {product.stock}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addToCart(product)}
                        disabled={product.stock <= 0}
                        className={`h-8 rounded-lg px-2 transition-all ${cart.some(item => item.product.id === product.id)
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                      >
                        {cart.some(item => item.product.id === product.id) ? "En lista" : "Vender"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-12 text-center text-muted-foreground"
                    >
                      {productSearch
                        ? "No se encontraron productos"
                        : "No hay productos registrados"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <Package className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1 flex justify-between items-start sm:items-center">
              <div>
                <CardTitle className="text-foreground">Ventas de hoy</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {todaySales.length} ventas registradas hoy
                </CardDescription>
              </div>
              <Button variant="link" className="text-primary text-sm p-0 h-auto" onClick={handleOpenHistory}>
                Ver más
              </Button>
            </div>
          </div>
          <div className="px-6 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filtrar ventas de hoy..."
                value={todaySalesSearch}
                onChange={(e) => setTodaySalesSearch(e.target.value)}
                className="h-8 rounded-lg border-0 bg-secondary/50 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
            {todaySales.map((sale) => (
              <div
                key={sale.id}
                className="rounded-lg bg-secondary/40 p-3 transition-colors hover:bg-secondary/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{sale.product}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.clientDni === 0
                        ? "Cliente espontáneo"
                        : sale.client?.nameComplete || `DNI ${sale.clientDni}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="whitespace-nowrap font-semibold text-foreground">
                      S/ {sale.amount.toLocaleString()}
                    </p>
                    <button
                      onClick={() => togglePendingPayment(sale.id)}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${pendingSalesIds.includes(sale.id)
                          ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                          : "bg-success/15 text-success hover:bg-success/25"
                        }`}
                    >
                      {pendingSalesIds.includes(sale.id) ? "Falta cancelar" : "Pagado"}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatSaleDate(sale.saleDate)}
                </p>
              </div>
            ))}
            {todaySales.length === 0 && (
              <div className="rounded-lg bg-secondary/30 py-10 text-center text-sm text-muted-foreground">
                No hay ventas registradas hoy
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isSelling} onOpenChange={setIsSelling}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar venta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-sm font-semibold mb-2">Resumen de productos</p>
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between gap-2 rounded-md bg-background/50 p-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">S/ {item.product.price} c/u</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-secondary rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 hover:bg-primary/20 transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 hover:bg-primary/20 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t flex justify-between items-center">
                <span className="text-sm font-medium">Total</span>
                <span className="text-lg font-bold text-primary">
                  S/ {cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={saleClientSearch}
                      onChange={(e) => {
                        setSaleClientSearch(e.target.value);
                        setSaleClientDni("");
                      }}
                      disabled={isWalkInClient}
                      placeholder="Buscar por nombre o DNI"
                      className="h-11 rounded-lg bg-secondary/50 pl-9 pr-9 disabled:opacity-70"
                    />
                    {saleClientDni && (
                      <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                    )}
                    {clientSuggestions.length > 0 && !saleClientDni && (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-lg border bg-popover shadow-lg">
                        {clientSuggestions.map((client) => (
                          <button
                            key={client.dni}
                            type="button"
                            onClick={() => {
                              setSaleClientDni(String(client.dni));
                              setSaleClientSearch(`${client.name} (${client.dni})`);
                            }}
                            className="flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-secondary focus:bg-secondary focus:outline-none"
                          >
                            <span className="text-sm font-medium text-foreground">
                              {client.name || "Sin nombre"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              DNI {client.dni}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {saleClientSearch &&
                    !saleClientDni &&
                    clientSuggestions.length === 0 &&
                    !isWalkInClient && (
                      <p className="text-xs text-muted-foreground">
                        No se encontraron clientes parecidos.
                      </p>
                    )}
                </div>
                <label className="flex h-11 items-center gap-2 rounded-lg border bg-secondary/30 px-3 text-sm text-foreground sm:whitespace-nowrap">
                  <Checkbox
                    checked={isWalkInClient}
                    onCheckedChange={(checked) => {
                      const nextChecked = checked === true;
                      setIsWalkInClient(nextChecked);
                      if (nextChecked) {
                        setSaleClientDni("");
                        setSaleClientSearch("Cliente espontáneo");
                      } else {
                        setSaleClientSearch("");
                      }
                    }}
                  />
                  Cliente espontáneo
                </label>
                <label className="flex h-11 items-center gap-2 rounded-lg border bg-secondary/30 px-3 text-sm text-foreground sm:whitespace-nowrap">
                  <Checkbox
                    checked={isPendingPayment}
                    onCheckedChange={(c) => setIsPendingPayment(c === true)}
                  />
                  Falta cancelar (Debe)
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSelling(false)} disabled={isSubmittingSale}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSell}
              disabled={
                isSubmittingSale ||
                cart.length === 0 ||
                (!isWalkInClient && !saleClientDni)
              }
            >
              {isSubmittingSale && <ButtonSpinner />}
              {isSubmittingSale ? "Registrando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Historial de ventas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleccionar fecha</label>
              <Input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                className="w-full bg-secondary/50"
              />
            </div>
            <div className="max-h-[300px] space-y-3 overflow-y-auto pr-2">
              {historySales.map((sale) => (
                <div
                  key={sale.id}
                  className="rounded-lg bg-secondary/40 p-3 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{sale.product}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.clientDni === 0
                          ? "Cliente espontáneo"
                          : sale.client?.nameComplete || `DNI ${sale.clientDni}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="whitespace-nowrap font-semibold text-foreground">
                        S/ {sale.amount.toLocaleString()}
                      </p>
                      <button
                        onClick={() => togglePendingPayment(sale.id)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${pendingSalesIds.includes(sale.id)
                            ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                            : "bg-success/15 text-success hover:bg-success/25"
                          }`}
                      >
                        {pendingSalesIds.includes(sale.id) ? "Falta cancelar" : "Pagado"}
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatSaleDate(sale.saleDate)}
                  </p>
                </div>
              ))}
              {historySales.length === 0 && (
                <div className="rounded-lg bg-secondary/30 py-10 text-center text-sm text-muted-foreground">
                  No hay ventas en esta fecha
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
