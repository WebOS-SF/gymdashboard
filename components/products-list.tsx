"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Edit2, Package, X, Check, Filter } from "lucide-react";
import { Product, Client } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProductsListProps {
  products: Product[];
  clients: Client[];
  onUpdateProduct: (product: Product) => void;
  onAddProduct: (product: Product) => void;
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

export function ProductsList({
  products,
  clients,
  onUpdateProduct,
  onAddProduct,
  onSaleRecorded,
}: ProductsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Product | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null);
  const [saleClientDni, setSaleClientDni] = useState("");
  const [saleClientSearch, setSaleClientSearch] = useState("");
  const [isWalkInClient, setIsWalkInClient] = useState(false);
  const [saleQty, setSaleQty] = useState(1);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    price: 0,
    stock: 0,
    category: "Suplementos",
  });

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setEditForm({ ...product });
  };

  const handleSaveEdit = () => {
    if (editForm) {
      onUpdateProduct(editForm);
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleOpenSell = (product: Product) => {
    setSellingProduct(product);
    setSaleClientDni("");
    setSaleClientSearch("");
    setIsWalkInClient(false);
    setSaleQty(1);
    setIsSelling(true);
  };

  const handleConfirmSell = async () => {
    if (!sellingProduct) return;
    if (!isWalkInClient && !saleClientDni) return;

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
    } catch (error) {
      console.error("Error registrando venta:", error);
    }
  };

  const handleAddProduct = async () => {
    if (newProduct.name && newProduct.price && newProduct.stock !== undefined) {
      try {
        const res = await fetch("/api/product", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newProduct),
        });

        const createdProduct = await res.json();

        // 🔥 esto actualiza la UI
        onAddProduct(createdProduct);

        setNewProduct({
          name: "",
          price: 0,
          stock: 0,
          category: "Suplementos",
        });

        setIsAdding(false);
      } catch (error) {
        console.error("Error creando producto:", error);
      }
    }
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return (
        <Badge className="bg-[#FF6B6B]/15 text-[#FF6B6B] border-0 font-medium">
          Sin Stock
        </Badge>
      );
    }
    if (stock <= 10) {
      return (
        <Badge className="bg-[#FFB347]/15 text-[#e09530] border-0 font-medium">
          Stock Bajo
        </Badge>
      );
    }
    return (
      <Badge className="bg-[#26DE81]/15 text-[#26DE81] border-0 font-medium">
        En Stock
      </Badge>
    );
  };

  return (
    <Card className="rounded-2xl border-0 shadow-sm bg-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#26DE81] to-[#20c572] flex items-center justify-center shadow-lg">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-foreground">Productos</CardTitle>
              <CardDescription className="text-muted-foreground">
                {filteredProducts.length} de {products.length} productos
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-secondary/50 border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-0 bg-secondary/50"
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setIsAdding(true)}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
              disabled={isAdding}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl bg-secondary/30">
          <Table>
            <TableHeader>
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                  Producto
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider hidden md:table-cell">
                  Categoría
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                  Precio
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                  Stock
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider hidden sm:table-cell">
                  Estado
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAdding && (
                <TableRow className="border-0 bg-secondary/50">
                  <TableCell>
                    <Input
                      value={newProduct.name}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, name: e.target.value })
                      }
                      placeholder="Nombre del producto"
                      className="h-9 rounded-lg bg-card border-0 text-foreground"
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Input
                      value={newProduct.category}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          category: e.target.value,
                        })
                      }
                      placeholder="Categoría"
                      className="h-9 rounded-lg bg-card border-0 text-foreground"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={newProduct.price || ""}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          price: Number(e.target.value),
                        })
                      }
                      placeholder="Precio"
                      className="h-9 rounded-lg bg-card border-0 text-foreground w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={newProduct.stock || ""}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          stock: Number(e.target.value),
                        })
                      }
                      placeholder="Stock"
                      className="h-9 rounded-lg bg-card border-0 text-foreground w-20"
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">-</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleAddProduct}
                        className="h-8 w-8 rounded-lg text-[#26DE81] hover:text-[#26DE81] hover:bg-[#26DE81]/10"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsAdding(false)}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {filteredProducts.map((product, index) => (
                <TableRow
                  key={product.id}
                  className={`border-0 hover:bg-secondary/50 transition-colors ${index % 2 === 0 ? "bg-card" : "bg-transparent"}`}
                >
                  {editingId === product.id ? (
                    <>
                      <TableCell>
                        <Input
                          value={editForm?.name || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm!, name: e.target.value })
                          }
                          className="h-9 rounded-lg bg-secondary/50 border-0 text-foreground"
                        />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Input
                          value={editForm?.category || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm!,
                              category: e.target.value,
                            })
                          }
                          className="h-9 rounded-lg bg-secondary/50 border-0 text-foreground"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editForm?.price || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm!,
                              price: Number(e.target.value),
                            })
                          }
                          className="h-9 rounded-lg bg-secondary/50 border-0 text-foreground w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editForm?.stock || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm!,
                              stock: Number(e.target.value),
                            })
                          }
                          className="h-9 rounded-lg bg-secondary/50 border-0 text-foreground w-20"
                        />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {getStockBadge(editForm?.stock || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSaveEdit}
                            className="h-8 w-8 rounded-lg text-[#26DE81] hover:text-[#26DE81] hover:bg-[#26DE81]/10"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancelEdit}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#5B8DEF] to-[#4a7de0] flex items-center justify-center text-white text-xs font-medium">
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
                          className="border-border/50 text-foreground font-normal rounded-lg"
                        >
                          {product.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground font-medium">
                        ${product.price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {product.stock}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {getStockBadge(product.stock)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product)}
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenSell(product)}
                          className="h-8 px-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                          Vender
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {filteredProducts.length === 0 && !isAdding && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    {searchTerm
                      ? "No se encontraron productos"
                      : "No hay productos registrados"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

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
                  {saleClientSearch && !saleClientDni && clientSuggestions.length === 0 && !isWalkInClient && (
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
                  value={saleQty}
                  onChange={(e) => setSaleQty(Number(e.target.value))}
                  className="h-11 rounded-lg bg-secondary/50"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSelling(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSell}
              disabled={
                !sellingProduct ||
                (!isWalkInClient && !saleClientDni) ||
                saleQty <= 0
              }
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
