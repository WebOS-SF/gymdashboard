"use client";

import { useMemo, useState } from "react";
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
import { Check, Package, Search, ShoppingCart } from "lucide-react";
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

  const handleOpenSell = (product: Product) => {
    setSellingProduct(product);
    setSaleClientDni("");
    setSaleClientSearch("");
    setIsWalkInClient(false);
    setSaleQty(1);
    setIsSelling(true);
  };

  const handleConfirmSell = async () => {
    if (!sellingProduct || isSubmittingSale) return;
    if (!isWalkInClient && !saleClientDni) return;

    setIsSubmittingSale(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: sellingProduct.id,
          clientDni: isWalkInClient ? null : saleClientDni,
          isWalkInClient,
          quantity: saleQty,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Error creating sale");
      }

      const payload = await res.json();
      if (payload?.product) {
        onUpdateProduct(payload.product);
      }

      setIsSelling(false);
      setSellingProduct(null);
      setSaleClientDni("");
      setSaleClientSearch("");
      setIsWalkInClient(false);
      onSaleRecorded();
      toast.success("Venta registrada", {
        description: "El stock y la venta se actualizaron correctamente.",
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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
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
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="h-10 rounded-xl border-0 bg-secondary/50 pl-9 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
              />
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
                      ${product.price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {product.stock}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenSell(product)}
                        disabled={product.stock <= 0}
                        className="h-8 rounded-lg px-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        Vender
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
            <div>
              <CardTitle className="text-foreground">Lista de ventas</CardTitle>
              <CardDescription className="text-muted-foreground">
                {sales.length} ventas registradas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
            {sales.map((sale) => (
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
                  <p className="whitespace-nowrap font-semibold text-foreground">
                    ${sale.amount.toLocaleString()}
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatSaleDate(sale.saleDate)}
                </p>
              </div>
            ))}
            {sales.length === 0 && (
              <div className="rounded-lg bg-secondary/30 py-10 text-center text-sm text-muted-foreground">
                No hay ventas registradas
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
              <p className="text-sm text-muted-foreground">Producto</p>
              <p className="text-sm font-medium">{sellingProduct?.name}</p>
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
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Cantidad</p>
                <Input
                  type="number"
                  min={1}
                  max={sellingProduct?.stock || undefined}
                  value={saleQty}
                  onChange={(e) => setSaleQty(Number(e.target.value))}
                  className="h-11 rounded-lg bg-secondary/50"
                />
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
                !sellingProduct ||
                (!isWalkInClient && !saleClientDni) ||
                saleQty <= 0 ||
                saleQty > (sellingProduct?.stock || 0)
              }
            >
              {isSubmittingSale && <ButtonSpinner />}
              {isSubmittingSale ? "Registrando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
