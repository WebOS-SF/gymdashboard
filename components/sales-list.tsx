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
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [settlingSale, setSettlingSale] = useState<ProductSale | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [settleAmount, setSettleAmount] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<{ clientDni: number, clientName: string, items: ProductSale[], total: number, totalDebt: number, isPaid: boolean, lastActivity: string, paymentMethod?: string } | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyDate, setHistoryDate] = useState("");
  const [pendingSalesIds, setPendingSalesIds] = useState<number[]>([]);
  const [todaySalesSearch, setTodaySalesSearch] = useState("");
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'single' | 'group';
    saleId?: number;
    group?: any;
  }>({ isOpen: false, type: 'single' });

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

  const togglePendingPayment = async (sale: ProductSale) => {
    const isCurrentlyPending = !sale.isPaid;

    if (isCurrentlyPending) {
      // Si está pendiente y queremos marcar como pagada, pedir monto y método de pago
      const remainingDebt = Math.max((sale.amount || 0) - (sale.amountPaid || 0), 0);
      setSettlingSale(sale);
      setSettleAmount(String(remainingDebt));
      setIsSettling(true);
    } else {
      // Si ya está pagada y queremos marcar como deuda (poco común pero posible)
      try {
        const res = await fetch(`/api/sales/${sale.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPaid: false, paymentMethod: "Pendiente" }),
        });
        if (res.ok) onSaleRecorded();
      } catch (e) {
        toast.error("Error al actualizar estado");
      }
    }
  };

  const handleConfirmSettle = async (method: string) => {
    if (!settlingSale || isSubmittingSale) return;

    const remainingDebt = Math.max((settlingSale.amount || 0) - (settlingSale.amountPaid || 0), 0);
    const amount = Math.min(Number(settleAmount), remainingDebt);
    if (!amount || amount <= 0) return;

    setIsSubmittingSale(true);
    try {
      const res = await fetch(`/api/sales/${settlingSale.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentAmount: amount, paymentMethod: method }),
      });

      if (!res.ok) throw new Error("Error al liquidar deuda");

      const updatedSale = await res.json();

      toast.success(amount >= remainingDebt ? "Venta liquidada" : "Abono registrado", {
        description: `Se registró el pago de S/ ${amount.toLocaleString()} por ${method}.`,
      });
      setIsSettling(false);
      setSettlingSale(null);
      setSettleAmount("");

      // Update selected group to reflect the paid status
      if (selectedGroup) {
        setSelectedGroup(prev => {
          if (!prev) return prev;
          const updatedItems = prev.items.map(item =>
            item.id === updatedSale.id ? { ...item, ...updatedSale } : item
          );
          const totalDebt = updatedItems.reduce((acc, item) => acc + Math.max((item.amount || 0) - (item.amountPaid || 0), 0), 0);
          const allPaid = totalDebt <= 0;
          return {
            ...prev,
            items: updatedItems,
            totalDebt,
            isPaid: allPaid,
            paymentMethod: allPaid ? method : prev.paymentMethod
          };
        });
      }
      
      onSaleRecorded();
    } catch (error) {
      toast.error("No se pudo actualizar el pago");
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (deleteConfirm.type === 'single' && deleteConfirm.saleId) {
        const res = await fetch(`/api/sales/${deleteConfirm.saleId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();
        toast.success("Venta eliminada", { description: "Se ha restaurado el stock." });
        
        // Update selected group to remove the item from view immediately
        setSelectedGroup(prev => {
          if (!prev) return prev;
          const newItems = prev.items.filter(i => i.id !== deleteConfirm.saleId);
          if (newItems.length === 0) {
             setIsDetailOpen(false);
             return null;
          }
          return {
            ...prev,
            items: newItems,
            total: newItems.reduce((acc, i) => acc + i.amount, 0)
          };
        });
        
        onSaleRecorded(); // To refresh sales list and products
      } else if (deleteConfirm.type === 'group' && deleteConfirm.group) {
        await Promise.all(deleteConfirm.group.items.map((item: any) => 
          fetch(`/api/sales/${item.id}`, { method: "DELETE" })
        ));
        toast.success("Ventas eliminadas", { description: "Se ha restaurado el stock." });
        if (selectedGroup?.clientDni === deleteConfirm.group.clientDni) {
          setIsDetailOpen(false);
          setSelectedGroup(null);
        }
        onSaleRecorded();
      }
    } catch (e) {
      toast.error("Error al eliminar la venta");
      onSaleRecorded(); // Refresh to get the latest state anyway
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleDeleteSale = (saleId: number) => {
    setDeleteConfirm({ isOpen: true, type: 'single', saleId });
  };

  const handleDeleteGroup = (group: any, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening the group detail
    setDeleteConfirm({ isOpen: true, type: 'group', group });
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

  const groupedTodaySales = useMemo(() => {
    const groups: Record<string, { clientDni: number, clientName: string, items: ProductSale[], total: number, totalDebt: number, isPaid: boolean, lastActivity: string, paymentMethod?: string }> = {};

    todaySales.forEach(sale => {
      const key = `${sale.clientDni}`;
      if (!groups[key]) {
        groups[key] = {
          clientDni: sale.clientDni,
          clientName: sale.clientDni === 0 ? "Cliente espontáneo" : sale.client?.nameComplete || `DNI ${sale.clientDni}`,
          items: [],
          total: 0,
          totalDebt: 0,
          isPaid: true,
          lastActivity: sale.saleDate,
          paymentMethod: sale.paymentMethod
        };
      }
      const debt = Math.max((sale.amount || 0) - (sale.amountPaid || 0), 0);
      groups[key].items.push(sale);
      groups[key].total += sale.amount;
      groups[key].totalDebt += debt;
      if (debt > 0) groups[key].isPaid = false;
      if (new Date(sale.saleDate) > new Date(groups[key].lastActivity)) {
        groups[key].lastActivity = sale.saleDate;
        groups[key].paymentMethod = sale.paymentMethod;
      }
    });

    return Object.values(groups).sort((a, b) => {
      const latestA = Math.max(...a.items.map(i => new Date(i.saleDate).getTime()));
      const latestB = Math.max(...b.items.map(i => new Date(i.saleDate).getTime()));
      return latestB - latestA;
    });
  }, [todaySales]);

  const groupedHistorySales = useMemo(() => {
    const groups: Record<string, { clientDni: number, clientName: string, items: ProductSale[], total: number, totalDebt: number, isPaid: boolean, lastActivity: string, paymentMethod?: string }> = {};

    historySales.forEach(sale => {
      const key = `${sale.clientDni}`;
      if (!groups[key]) {
        groups[key] = {
          clientDni: sale.clientDni,
          clientName: sale.clientDni === 0 ? "Cliente espontáneo" : sale.client?.nameComplete || `DNI ${sale.clientDni}`,
          items: [],
          total: 0,
          totalDebt: 0,
          isPaid: true,
          lastActivity: sale.saleDate,
          paymentMethod: sale.paymentMethod
        };
      }
      const debt = Math.max((sale.amount || 0) - (sale.amountPaid || 0), 0);
      groups[key].items.push(sale);
      groups[key].total += sale.amount;
      groups[key].totalDebt += debt;
      if (debt > 0) groups[key].isPaid = false;
      if (new Date(sale.saleDate) > new Date(groups[key].lastActivity)) {
        groups[key].lastActivity = sale.saleDate;
        groups[key].paymentMethod = sale.paymentMethod;
      }
    });

    return Object.values(groups);
  }, [historySales]);

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
    setPaymentMethod("Efectivo");
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
          paymentMethod: isPendingPayment ? "Pendiente" : paymentMethod,
          isPendingPayment,
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
      setPaymentMethod("Efectivo");
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
                  {groupedTodaySales.length} clientes atendidos hoy
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
            {groupedTodaySales.map((group) => (
              <div
                key={group.clientDni}
                onClick={() => {
                  setSelectedGroup(group);
                  setIsDetailOpen(true);
                }}
                className="group cursor-pointer rounded-2xl bg-secondary/30 p-4 transition-all hover:bg-secondary/50 border border-transparent hover:border-border/50"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-foreground uppercase tracking-tight text-lg">{group.clientName}</h3>
                      {group.isPaid && group.paymentMethod && (
                        <Badge 
                          variant="secondary" 
                          className={`h-5 px-2 text-[10px] font-bold border-0 rounded-lg ${
                            group.paymentMethod === 'Efectivo' ? 'bg-[#26DE81]/15 text-[#26DE81]' :
                            group.paymentMethod === 'Plin' ? 'bg-[#5B8DEF]/15 text-[#5B8DEF]' :
                            'bg-[#9B6DD7]/15 text-[#9B6DD7]'
                          }`}
                        >
                          {group.paymentMethod}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {group.items.length} producto{group.items.length !== 1 ? 's' : ''} consumidos
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="whitespace-nowrap font-black text-2xl text-foreground italic">
                      S/ {group.total.toLocaleString()}
                    </p>
                    <div className={`text-[10px] px-3 py-1 rounded-lg font-bold uppercase tracking-wider ${!group.isPaid
                          ? "bg-destructive/15 text-destructive border border-destructive/20"
                          : "bg-success/15 text-success border border-success/20"
                        }`}>
                      {!group.isPaid ? `Falta S/ ${group.totalDebt.toLocaleString()}` : "Pagado"}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-border/10">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteGroup(group, e)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      Última actividad: {formatSaleDate(group.lastActivity)}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-destructive hover:underline flex items-center gap-1 transition-all group-hover:gap-2">
                    Ver detalle <span className="text-lg leading-none">→</span>
                  </span>
                </div>
              </div>
            ))}
            {groupedTodaySales.length === 0 && (
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

              {!isPendingPayment && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-sm text-muted-foreground">Método de pago</p>
                  <div className="flex flex-wrap gap-2">
                    {["Efectivo", "Plin", "Yape"].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`flex-1 h-10 px-4 rounded-xl text-sm font-medium transition-all border ${
                          paymentMethod === method
                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                            : "bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
              {groupedHistorySales.map((group) => (
                <div
                  key={group.clientDni}
                  onClick={() => {
                    setSelectedGroup(group);
                    setIsDetailOpen(true);
                  }}
                  className="cursor-pointer rounded-lg bg-secondary/40 p-3 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{group.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.items.length} producto{group.items.length !== 1 ? 's' : ''} consumidos
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end gap-1">
                        <p className="whitespace-nowrap font-semibold text-foreground">
                          S/ {group.total.toLocaleString()}
                        </p>
                        <div className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${!group.isPaid
                              ? "bg-destructive/15 text-destructive"
                              : "bg-success/15 text-success"
                            }`}>
                          {!group.isPaid ? `Falta S/ ${group.totalDebt.toLocaleString()}` : "Pagado"}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteGroup(group, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {groupedHistorySales.length === 0 && (
                <div className="rounded-lg bg-secondary/30 py-10 text-center text-sm text-muted-foreground">
                  No hay ventas en esta fecha
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettling} onOpenChange={setIsSettling}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Liquidar deuda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">Producto: <span className="text-foreground font-medium">{settlingSale?.product}</span></p>
              <p className="text-2xl font-black text-primary">
                S/ {settlingSale ? Math.max((settlingSale.amount || 0) - (settlingSale.amountPaid || 0), 0).toLocaleString() : 0}
              </p>
              {(settlingSale?.amountPaid || 0) > 0 && (
                <p className="text-xs text-muted-foreground">Ya abonó S/ {(settlingSale?.amountPaid || 0).toLocaleString()}</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-center">Monto a abonar</p>
              <Input
                type="number"
                min={0}
                max={settlingSale ? Math.max((settlingSale.amount || 0) - (settlingSale.amountPaid || 0), 0) : undefined}
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                className="h-11 text-center text-lg font-bold rounded-xl bg-secondary/50"
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-center">¿Cómo canceló el cliente?</p>
              <div className="grid grid-cols-1 gap-2">
                {["Efectivo", "Plin", "Yape"].map((method) => (
                  <Button
                    key={method}
                    variant="outline"
                    onClick={() => handleConfirmSettle(method)}
                    disabled={isSubmittingSale || !Number(settleAmount) || Number(settleAmount) <= 0}
                    className="h-12 rounded-xl border-secondary bg-secondary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all font-bold"
                  >
                    {method}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Consumo de {selectedGroup?.clientName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {selectedGroup?.items.map((sale) => {
                const debt = Math.max((sale.amount || 0) - (sale.amountPaid || 0), 0);
                return (
                <div key={sale.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                  <div>
                    <p className="text-base font-medium">{sale.product}</p>
                    <p className="text-xs text-muted-foreground">{formatSaleDate(sale.saleDate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-base font-bold">S/ {sale.amount.toLocaleString()}</p>
                      {debt > 0 && (sale.amountPaid || 0) > 0 && (
                        <p className="text-sm text-muted-foreground">Abonado S/ {(sale.amountPaid || 0).toLocaleString()}</p>
                      )}
                      {debt > 0 && (
                        <p className="text-sm font-semibold text-destructive">Falta S/ {debt.toLocaleString()}</p>
                      )}
                      {debt <= 0 && (
                        <Badge
                          variant="secondary"
                          className={`h-5 px-1.5 text-[11px] font-bold border-0 ${
                            sale.paymentMethod === 'Efectivo' ? 'bg-[#26DE81]/15 text-[#26DE81]' :
                            sale.paymentMethod === 'Plin' ? 'bg-[#5B8DEF]/15 text-[#5B8DEF]' :
                            'bg-[#9B6DD7]/15 text-[#9B6DD7]'
                          }`}
                        >
                          {sale.paymentMethod}
                        </Badge>
                      )}
                    </div>
                    {debt > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePendingPayment(sale)}
                        className="h-7 text-xs bg-destructive/15 text-destructive hover:bg-destructive/25 rounded-full"
                      >
                        Cobrar
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteSale(sale.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="pt-4 border-t flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground uppercase font-black tracking-wider">Total consumido</p>
                <p className="text-2xl font-black text-primary">S/ {selectedGroup?.total.toLocaleString()}</p>
                {(selectedGroup?.totalDebt || 0) > 0 && (
                  <p className="text-sm font-bold text-destructive">Falta S/ {selectedGroup?.totalDebt.toLocaleString()}</p>
                )}
              </div>
              <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="rounded-xl">
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm.isOpen} onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-sm text-muted-foreground">
              ¿Estás seguro de que deseas eliminar {deleteConfirm.type === 'single' ? 'este producto vendido' : 'todas las ventas de este grupo'}?
            </p>
            <p className="text-sm font-semibold text-foreground">
              El stock se restaurará automáticamente.
            </p>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))} disabled={isDeleting} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting} className="w-full sm:w-auto">
              {isDeleting && <ButtonSpinner />}
              {isDeleting ? "Eliminando..." : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
