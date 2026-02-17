'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  IceCream,
  Cherry,
  RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

type ProductCategory = 'base' | 'addon'

interface ProductFormData {
  name: string
  description: string
  price: string
  is_available: boolean
}

const initialFormData: ProductFormData = {
  name: '',
  description: '',
  price: '0',
  is_available: true,
}

export default function ProductsPage() {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ProductCategory>('base')
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<ProductFormData>(initialFormData)
  const [isSaving, setIsSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [clearImage, setClearImage] = useState(false)

  const supabase = createClient()
  const getErrorMessage = (err: unknown) => {
    if (!err) return 'Erro desconhecido'
    if (typeof err === 'string') return err
    if (err instanceof Error) {
      if (err.message === 'Failed to fetch') {
        return 'Falha de rede ao acessar o banco. Verifique a URL do Supabase e sua conexão.'
      }
      return err.message
    }
    const e = err as any
    if (typeof e?.message === 'string') return e.message
    const parts = [e?.code, e?.details, e?.hint, e?.error].filter(Boolean)
    if (parts.length) return parts.join(' | ')
    try {
      const json = JSON.stringify(e)
      return json !== '{}' ? json : 'Erro desconhecido'
    } catch {
      return 'Erro desconhecido'
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('category', ['base', 'addon'])
        .order('category')
        .order('name')
      if (error) {
        const msg = getErrorMessage(error)
        console.error('Error fetching products:', msg)
        toast({ title: 'Erro', description: msg, variant: 'destructive' })
        return
      }
      setProducts(data || [])
    } catch (err) {
      const msg = getErrorMessage(err)
      console.error('Error fetching products:', msg)
      toast({ title: 'Erro', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const filteredProducts = products.filter((p) => p.category === activeTab)

  const uploadImage = async (file: File) => {
    try {
      const bucket = 'products'
      const ext = (file.name.split('.').pop() || '').toLowerCase() || (file.type.split('/')[1] || 'jpg')
      const safeName = formData.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
      const folder = activeTab === 'addon' ? 'addons' : 'bases'
      const path = `${folder}/${crypto.randomUUID()}-${safeName || 'produto'}.${ext}`
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      })
      if (uploadError) {
        const msg = getErrorMessage(uploadError)
        toast({ title: 'Erro ao enviar imagem', description: msg, variant: 'destructive' })
        return null
      }
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      return data.publicUrl || null
    } catch (e) {
      const msg = getErrorMessage(e)
      toast({ title: 'Erro ao enviar imagem', description: msg, variant: 'destructive' })
      return null
    }
  }

  const handleAddProduct = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' })
      return
    }

    setIsSaving(true)
    let imageUrl: string | null = null
    if (imageFile) {
      imageUrl = await uploadImage(imageFile)
    }
    const { error } = await supabase.from('products').insert({
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      price: parseFloat(formData.price) || 0,
      category: activeTab,
      is_available: formData.is_available,
      image_url: imageUrl,
    })

    if (error) {
      const msg = getErrorMessage(error)
      console.error('Error adding product:', msg)
      toast({ title: 'Erro', description: msg || 'Erro ao adicionar produto', variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Produto adicionado com sucesso!' })
      setIsAddDialogOpen(false)
      setFormData(initialFormData)
      setImageFile(null)
      setImagePreview(null)
      setClearImage(false)
      fetchProducts()
    }
    setIsSaving(false)
  }

  const handleEditProduct = async () => {
    if (!selectedProduct) return
    if (!formData.name.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' })
      return
    }

    setIsSaving(true)
    let newImageUrl: string | null | undefined = undefined
    if (clearImage) {
      newImageUrl = null
    } else if (imageFile) {
      newImageUrl = await uploadImage(imageFile)
    }
    const updates: any = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      price: parseFloat(formData.price) || 0,
      is_available: formData.is_available,
      updated_at: new Date().toISOString(),
    }
    if (newImageUrl !== undefined) {
      updates.image_url = newImageUrl
    }
    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', selectedProduct.id)

    if (error) {
      const msg = getErrorMessage(error)
      console.error('Error updating product:', msg)
      toast({ title: 'Erro', description: msg || 'Erro ao atualizar produto', variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Produto atualizado com sucesso!' })
      setIsEditDialogOpen(false)
      setSelectedProduct(null)
      setFormData(initialFormData)
      setImageFile(null)
      setImagePreview(null)
      setClearImage(false)
      fetchProducts()
    }
    setIsSaving(false)
  }

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return

    setIsSaving(true)
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', selectedProduct.id)

    if (error) {
      const msg = getErrorMessage(error)
      console.error('Error deleting product:', msg)
      toast({ title: 'Erro', description: msg || 'Erro ao excluir produto', variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Produto excluído com sucesso!' })
      setIsDeleteDialogOpen(false)
      setSelectedProduct(null)
      fetchProducts()
    }
    setIsSaving(false)
  }

  const handleToggleAvailability = async (product: Product) => {
    const { error } = await supabase
      .from('products')
      .update({
        is_available: !product.is_available,
        updated_at: new Date().toISOString(),
      })
      .eq('id', product.id)

    if (error) {
      const msg = getErrorMessage(error)
      console.error('Error toggling availability:', msg)
      toast({ title: 'Erro', description: msg || 'Erro ao atualizar disponibilidade', variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: `${product.name} ${!product.is_available ? 'ativado' : 'desativado'}` })
      fetchProducts()
    }
  }

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      is_available: product.is_available,
    })
    setImageFile(null)
    setImagePreview(product.image_url || null)
    setClearImage(false)
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product)
    setIsDeleteDialogOpen(true)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as bases e adicionais do açaí
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchProducts}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Novo {activeTab === 'base' ? 'Sabor' : 'Adicional'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Adicionar {activeTab === 'base' ? 'Sabor de Base' : 'Adicional'}
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo produto
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder={activeTab === 'base' ? 'Ex: Açaí com Cupuaçu' : 'Ex: Granola Premium'}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Descrição breve do produto"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Preço Adicional (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.50"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {activeTab === 'base' 
                      ? 'Valor extra cobrado pela base (0 para base padrão)' 
                      : 'Valor cobrado por este adicional'}
                  </p>
                </div>
              <div className="grid gap-2">
                <Label htmlFor="image">Imagem (opcional)</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null
                    setImageFile(f)
                    setClearImage(false)
                    setImagePreview(f ? URL.createObjectURL(f) : null)
                  }}
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Prévia da imagem"
                      className="h-24 w-24 rounded-md object-cover"
                    />
                  </div>
                )}
              </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="available"
                    checked={formData.is_available}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                  />
                  <Label htmlFor="available">Disponível para venda</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddProduct} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProductCategory)}>
        <TabsList className="mb-4">
          <TabsTrigger value="base" className="gap-2">
            <IceCream className="h-4 w-4" />
            Sabores de Base
          </TabsTrigger>
          <TabsTrigger value="addon" className="gap-2">
            <Cherry className="h-4 w-4" />
            Adicionais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="base">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sabores de Base do Açaí</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure os sabores disponíveis para a base do açaí (Puro, com Banana, com Morango, etc.)
              </p>
            </CardHeader>
            <CardContent>
              <ProductTable
                products={filteredProducts}
                loading={loading}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
                onToggleAvailability={handleToggleAvailability}
                formatPrice={formatPrice}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addon">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Adicionais</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure os adicionais disponíveis (Granola, Leite em Pó, Frutas, etc.)
              </p>
            </CardHeader>
            <CardContent>
              <ProductTable
                products={filteredProducts}
                loading={loading}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
                onToggleAvailability={handleToggleAvailability}
                formatPrice={formatPrice}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>
              Atualize as informações do produto
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-price">Preço Adicional (R$)</Label>
              <Input
                id="edit-price"
                type="number"
                min="0"
                step="0.50"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-image">Imagem</Label>
              <Input
                id="edit-image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  setImageFile(f)
                  setImagePreview(f ? URL.createObjectURL(f) : null)
                  setClearImage(false)
                }}
              />
              {imagePreview ? (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Imagem do produto"
                    className="h-24 w-24 rounded-md object-cover"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview(null)
                      setClearImage(true)
                    }}
                  >
                    Remover imagem
                  </Button>
                </div>
              ) : (
                selectedProduct?.image_url && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={selectedProduct.image_url}
                      alt="Imagem atual"
                      className="h-24 w-24 rounded-md object-cover"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setImageFile(null)
                        setImagePreview(null)
                        setClearImage(true)
                      }}
                    >
                      Remover imagem
                    </Button>
                  </div>
                )
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="edit-available"
                checked={formData.is_available}
                onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
              />
              <Label htmlFor="edit-available">Disponível para venda</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditProduct} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{selectedProduct?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface ProductTableProps {
  products: Product[]
  loading: boolean
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  onToggleAvailability: (product: Product) => void
  formatPrice: (price: number) => string
}

function ProductTable({
  products,
  loading,
  onEdit,
  onDelete,
  onToggleAvailability,
  formatPrice,
}: ProductTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <IceCream className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhum produto cadastrado
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="hidden sm:table-cell">Descrição</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[70px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="hidden max-w-[200px] truncate text-muted-foreground sm:table-cell">
                {product.description || '-'}
              </TableCell>
              <TableCell>
                {product.price > 0 ? (
                  <span className="font-medium text-primary">
                    +{formatPrice(product.price)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Incluso</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={product.is_available}
                    onCheckedChange={() => onToggleAvailability(product)}
                  />
                  <Badge
                    variant={product.is_available ? 'default' : 'secondary'}
                    className={product.is_available ? 'bg-accent text-accent-foreground' : ''}
                  >
                    {product.is_available ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(product)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(product)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
