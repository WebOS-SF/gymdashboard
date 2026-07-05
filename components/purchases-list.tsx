"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ButtonSpinner } from "@/components/ui/button-spinner";
import { Search, Plus, Edit2, Trash2, Receipt, X, Check } from "lucide-react";
import { Product, Purchase } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const PAYMENT_METHODS = ["Efectivo", "Plin", "Yape"];
const CATEGORY_OPTIONS = ["Producto", "Servicio"] as const;

interface PurchasesListProps {
  purchases: Purchase[];
  products: Product[];
  onAddPurchase: (purchase: Purchase) => void;
  onUpdatePurchase: (purchase: Purchase) => void;
  onDeletePurchase: (id: number) => void;
  onUpdateProduct: (product: Product) => void;
}

const toDateInputValue = (value: string) => value.slice(0, 10);

type PurchaseForm = {
  purchaseDate: string;
  description: string;
  category: string;
  quantity: number;
  amount: number;
  paymentMethod: string;
  productId: number | null;
};

const emptyForm: PurchaseForm = {
  purchaseDate: toDateInputValue(new Date().toISOString()),
  description: "",
  category: "Producto",
  quantity: 1,
  amount: 0,
  paymentMethod: "Efectivo",
  productId: null,
};

export function PurchasesList({
  purchases,
  products,
  onAddPurchase,
  onUpdatePurchase,
  onDeletePurchase,
  onUpdateProduct,
}: PurchasesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newPurchase, setNewPurchase] = useState<PurchaseForm>(emptyForm);
  const [isCreating, setIsCreating] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<PurchaseForm | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredPurchases = purchases.filter(
    (purchase) =>
      purchase.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddPurchase = async () => {
    if (isCreating || !newPurchase.description || !newPurchase.category || !newPurchase.amount) return;
    if (newPurchase.category === "Producto" && !newPurchase.productId) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPurchase),
      });
      const created = await res.json();

      if (!res.ok) {
        throw new Error(created?.error || "No se pudo registrar la compra");
      }

      const { updatedProduct, ...purchase } = created;
      onAddPurchase(purchase);
      if (updatedProduct) onUpdateProduct(updatedProduct);
      setNewPurchase(emptyForm);
      setIsAdding(false);
      toast.success("Compra registrada", {
        description: "El nuevo registro ya aparece en la lista.",
      });
    } catch (error) {
      console.error("Error creando compra:", error);
      toast.error("No se pudo registrar la compra", {
        description: error instanceof Error ? error.message : "Inténtalo nuevamente.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingId(purchase.id);
    setEditForm({
      purchaseDate: toDateInputValue(purchase.purchaseDate),
      description: purchase.description,
      category: purchase.category,
      quantity: purchase.quantity,
      amount: purchase.amount,
      paymentMethod: purchase.paymentMethod,
      productId: purchase.productId ?? null,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!editForm || editingId === null || isUpdating) return;
    if (editForm.category === "Producto" && !editForm.productId) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/purchases/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const updated = await res.json();

      if (!res.ok) {
        throw new Error(updated?.error || "No se pudo actualizar la compra");
      }

      const { affectedProducts, ...purchase } = updated;
      onUpdatePurchase(purchase);
      (affectedProducts || []).forEach((product: Product) => onUpdateProduct(product));
      setEditingId(null);
      setEditForm(null);
      toast.success("Compra actualizada", {
        description: "Los cambios quedaron guardados.",
      });
    } catch (error) {
      console.error("Error actualizando compra:", error);
      toast.error("No se pudo actualizar la compra", {
        description: error instanceof Error ? error.message : "Inténtalo nuevamente.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingId === null || isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/purchases/${deletingId}`, {
        method: "DELETE",
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(result?.error || "No se pudo eliminar la compra");
      }

      onDeletePurchase(deletingId);
      if (result.updatedProduct) onUpdateProduct(result.updatedProduct);
      setDeletingId(null);
      toast.success("Compra eliminada");
    } catch (error) {
      console.error("Error eliminando compra:", error);
      toast.error("No se pudo eliminar la compra", {
        description: error instanceof Error ? error.message : "Inténtalo nuevamente.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="rounded-2xl border-0 shadow-sm bg-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B8DEF] to-[#4a7de0] flex items-center justify-center shadow-lg">
              <Receipt className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-foreground">Compras</CardTitle>
              <CardDescription className="text-muted-foreground">
                {filteredPurchases.length} de {purchases.length} compras
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar compra..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-secondary/50 border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20"
              />
            </div>
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
                  Fecha
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                  Descripción
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider hidden md:table-cell">
                  Categoría
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                  Cantidad
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider">
                  Monto
                </TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs uppercase tracking-wider hidden sm:table-cell">
                  Método de pago
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
                      type="date"
                      value={newPurchase.purchaseDate}
                      onChange={(e) =>
                        setNewPurchase({ ...newPurchase, purchaseDate: e.target.value })
                      }
                      className="h-9 rounded-lg bg-card border-0 text-foreground w-36"
                    />
                  </TableCell>
                  <TableCell>
                    {newPurchase.category === "Producto" ? (
                      <Select
                        value={newPurchase.productId ? String(newPurchase.productId) : ""}
                        onValueChange={(value) => {
                          const product = products.find((p) => p.id === Number(value));
                          setNewPurchase({
                            ...newPurchase,
                            productId: Number(value),
                            description: product?.name || "",
                          });
                        }}
                      >
                        <SelectTrigger className="h-9 rounded-lg bg-card border-0 text-foreground">
                          <SelectValue placeholder="Selecciona un producto" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {products.map((product) => (
                            <SelectItem key={product.id} value={String(product.id)}>
                              {product.name} (Stock: {product.stock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={newPurchase.description}
                        onChange={(e) =>
                          setNewPurchase({ ...newPurchase, description: e.target.value })
                        }
                        placeholder="Servicio contratado"
                        className="h-9 rounded-lg bg-card border-0 text-foreground"
                      />
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Select
                      value={newPurchase.category}
                      onValueChange={(value) =>
                        setNewPurchase({
                          ...newPurchase,
                          category: value,
                          quantity: value === "Servicio" ? 1 : newPurchase.quantity,
                          productId: null,
                          description: "",
                        })
                      }
                    >
                      <SelectTrigger className="h-9 rounded-lg bg-card border-0 text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={newPurchase.quantity || ""}
                      onChange={(e) =>
                        setNewPurchase({ ...newPurchase, quantity: Number(e.target.value) })
                      }
                      disabled={newPurchase.category === "Servicio"}
                      placeholder="Cant."
                      className="h-9 rounded-lg bg-card border-0 text-foreground w-20 disabled:opacity-40"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={newPurchase.amount || ""}
                      onChange={(e) =>
                        setNewPurchase({ ...newPurchase, amount: Number(e.target.value) })
                      }
                      placeholder="Monto"
                      className="h-9 rounded-lg bg-card border-0 text-foreground w-24"
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex gap-1">
                      {PAYMENT_METHODS.map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setNewPurchase({ ...newPurchase, paymentMethod: method })}
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                            newPurchase.paymentMethod === method
                              ? "bg-primary text-primary-foreground"
                              : "bg-card text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleAddPurchase}
                        disabled={isCreating}
                        className="h-8 w-8 rounded-lg text-[#26DE81] hover:text-[#26DE81] hover:bg-[#26DE81]/10"
                      >
                        {isCreating ? <ButtonSpinner /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setIsAdding(false);
                          setNewPurchase(emptyForm);
                        }}
                        disabled={isCreating}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {filteredPurchases.map((purchase, index) => (
                <TableRow
                  key={purchase.id}
                  className={`border-0 hover:bg-secondary/50 transition-colors ${index % 2 === 0 ? "bg-card" : "bg-transparent"}`}
                >
                  {editingId === purchase.id ? (
                    <>
                      <TableCell>
                        <Input
                          type="date"
                          value={editForm?.purchaseDate || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm!, purchaseDate: e.target.value })
                          }
                          className="h-9 rounded-lg bg-secondary/50 border-0 text-foreground w-36"
                        />
                      </TableCell>
                      <TableCell>
                        {editForm?.category === "Producto" ? (
                          <Select
                            value={editForm?.productId ? String(editForm.productId) : ""}
                            onValueChange={(value) => {
                              const product = products.find((p) => p.id === Number(value));
                              setEditForm({
                                ...editForm!,
                                productId: Number(value),
                                description: product?.name || "",
                              });
                            }}
                          >
                            <SelectTrigger className="h-9 rounded-lg bg-secondary/50 border-0 text-foreground">
                              <SelectValue placeholder="Selecciona un producto" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                              {products.map((product) => (
                                <SelectItem key={product.id} value={String(product.id)}>
                                  {product.name} (Stock: {product.stock})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={editForm?.description || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm!, description: e.target.value })
                            }
                            className="h-9 rounded-lg bg-secondary/50 border-0 text-foreground"
                          />
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Select
                          value={editForm?.category || ""}
                          onValueChange={(value) =>
                            setEditForm({
                              ...editForm!,
                              category: value,
                              quantity: value === "Servicio" ? 1 : editForm!.quantity,
                              productId: null,
                              description: "",
                            })
                          }
                        >
                          <SelectTrigger className="h-9 rounded-lg bg-secondary/50 border-0 text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            {CATEGORY_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={editForm?.quantity || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm!, quantity: Number(e.target.value) })
                          }
                          disabled={editForm?.category === "Servicio"}
                          className="h-9 rounded-lg bg-secondary/50 border-0 text-foreground w-20 disabled:opacity-40"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editForm?.amount || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm!, amount: Number(e.target.value) })
                          }
                          className="h-9 rounded-lg bg-secondary/50 border-0 text-foreground w-24"
                        />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex gap-1">
                          {PAYMENT_METHODS.map((method) => (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setEditForm({ ...editForm!, paymentMethod: method })}
                              className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                editForm?.paymentMethod === method
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSaveEdit}
                            disabled={isUpdating}
                            className="h-8 w-8 rounded-lg text-[#26DE81] hover:text-[#26DE81] hover:bg-[#26DE81]/10"
                          >
                            {isUpdating ? <ButtonSpinner /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancelEdit}
                            disabled={isUpdating}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-foreground">
                        {new Date(purchase.purchaseDate).toLocaleDateString("es-PE")}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {purchase.description}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge
                          variant="outline"
                          className="border-border/50 text-foreground font-normal rounded-lg"
                        >
                          {purchase.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {purchase.category === "Servicio" ? "—" : purchase.quantity}
                      </TableCell>
                      <TableCell className="text-foreground font-medium">
                        S/ {purchase.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge className="bg-[#5B8DEF]/15 text-[#5B8DEF] border-0 font-medium">
                          {purchase.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(purchase)}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingId(purchase.id)}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {filteredPurchases.length === 0 && !isAdding && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {searchTerm ? "No se encontraron compras" : "No hay compras registradas"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">¿Eliminar esta compra?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Esta acción no se puede deshacer. El registro será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-secondary">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white"
            >
              {isDeleting && <ButtonSpinner />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
