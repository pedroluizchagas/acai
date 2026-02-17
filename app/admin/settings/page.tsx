'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Store,
  Clock,
  Truck,
  Bell,
  Save,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    storeName: 'Açaí da Serra',
    phone: '(11) 99999-9999',
    address: 'Rua das Palmeiras, 123 - Centro',
    openTime: '10:00',
    closeTime: '22:00',
    deliveryFee: '5.00',
    minOrder: '15.00',
    deliveryRadius: '5',
    acceptOrders: true,
    notifications: true,
    autoAccept: false,
    marketingId: null as string | null,
    metaPixelId: '',
    ga4Id: '',
    googleReviewLink: '',
    firstOrderBannerEnabled: false,
    firstOrderBannerText: '10% OFF no seu primeiro pedido',
    firstOrderCouponCode: 'PRIMEIRA10',
    whatsappEnabled: false,
    whatsappProviderUrl: '',
    whatsappProviderToken: '',
    whatsappSender: '',
  })

  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadMarketingSettings = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('marketing_settings')
        .select('*')
        .limit(1)
        .single()
      if (!error && data) {
        setSettings((prev) => ({
          ...prev,
          marketingId: data.id as string,
          metaPixelId: (data.meta_pixel_id as string) || '',
          ga4Id: (data.ga4_id as string) || '',
          googleReviewLink: (data.google_review_link as string) || '',
          firstOrderBannerEnabled: Boolean(data.first_order_banner_enabled),
          firstOrderBannerText: (data.first_order_banner_text as string) || prev.firstOrderBannerText,
          firstOrderCouponCode: (data.first_order_coupon_code as string) || prev.firstOrderCouponCode,
          whatsappEnabled: Boolean(data.whatsapp_enabled),
          whatsappProviderUrl: (data.whatsapp_provider_url as string) || '',
          whatsappProviderToken: (data.whatsapp_provider_token as string) || '',
          whatsappSender: (data.whatsapp_sender as string) || '',
        }))
      }
    }
    loadMarketingSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const payload = {
        id: settings.marketingId || undefined,
        meta_pixel_id: settings.metaPixelId || null,
        ga4_id: settings.ga4Id || null,
        google_review_link: settings.googleReviewLink || null,
        first_order_banner_enabled: settings.firstOrderBannerEnabled,
        first_order_banner_text: settings.firstOrderBannerText || null,
        first_order_coupon_code: settings.firstOrderCouponCode || null,
        whatsapp_enabled: settings.whatsappEnabled,
        whatsapp_provider_url: settings.whatsappProviderUrl || null,
        whatsapp_provider_token: settings.whatsappProviderToken || null,
        whatsapp_sender: settings.whatsappSender || null,
        updated_at: new Date().toISOString(),
      }
      if (settings.marketingId) {
        const { error } = await supabase
          .from('marketing_settings')
          .update(payload)
          .eq('id', settings.marketingId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('marketing_settings')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        setSettings((prev) => ({ ...prev, marketingId: data.id as string }))
      }
      toast({ title: 'Sucesso', description: 'Configurações salvas com sucesso!' })
    } catch (e) {
      toast({ title: 'Erro', description: 'Erro ao salvar configurações', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Gerencie as configurações da sua loja
        </p>
      </div>

      <div className="space-y-6">
        {/* Store Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <CardTitle>Informações da Loja</CardTitle>
            </div>
            <CardDescription>
              Dados básicos do seu estabelecimento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="storeName">Nome da Loja</Label>
                <Input
                  id="storeName"
                  value={settings.storeName}
                  onChange={(e) =>
                    setSettings({ ...settings, storeName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={settings.phone}
                  onChange={(e) =>
                    setSettings({ ...settings, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={settings.address}
                onChange={(e) =>
                  setSettings({ ...settings, address: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Hours */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Horário de Funcionamento</CardTitle>
            </div>
            <CardDescription>
              Configure o horário de atendimento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="openTime">Horário de Abertura</Label>
                <Input
                  id="openTime"
                  type="time"
                  value={settings.openTime}
                  onChange={(e) =>
                    setSettings({ ...settings, openTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closeTime">Horário de Fechamento</Label>
                <Input
                  id="closeTime"
                  type="time"
                  value={settings.closeTime}
                  onChange={(e) =>
                    setSettings({ ...settings, closeTime: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <CardTitle>Entrega</CardTitle>
            </div>
            <CardDescription>
              Configurações de entrega e valores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="deliveryFee">Taxa de Entrega (R$)</Label>
                <Input
                  id="deliveryFee"
                  type="number"
                  step="0.50"
                  value={settings.deliveryFee}
                  onChange={(e) =>
                    setSettings({ ...settings, deliveryFee: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minOrder">Pedido Mínimo (R$)</Label>
                <Input
                  id="minOrder"
                  type="number"
                  step="0.50"
                  value={settings.minOrder}
                  onChange={(e) =>
                    setSettings({ ...settings, minOrder: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryRadius">Raio de Entrega (km)</Label>
                <Input
                  id="deliveryRadius"
                  type="number"
                  value={settings.deliveryRadius}
                  onChange={(e) =>
                    setSettings({ ...settings, deliveryRadius: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Marketing & Tracking */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Marketing e Rastreamento</CardTitle>
            </div>
            <CardDescription>
              Configure Pixel da Meta, Google Analytics 4 e link do Google Reviews
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="metaPixelId">ID do Pixel da Meta</Label>
                <Input
                  id="metaPixelId"
                  placeholder="Ex: 123456789012345"
                  value={settings.metaPixelId}
                  onChange={(e) =>
                    setSettings({ ...settings, metaPixelId: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ga4Id">ID de Medição do GA4</Label>
                <Input
                  id="ga4Id"
                  placeholder="Ex: G-XXXXXXXXXX"
                  value={settings.ga4Id}
                  onChange={(e) =>
                    setSettings({ ...settings, ga4Id: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="googleReviewLink">Link do Google Reviews</Label>
              <Input
                id="googleReviewLink"
                placeholder="https://maps.google.com/?cid=..."
                value={settings.googleReviewLink}
                onChange={(e) =>
                  setSettings({ ...settings, googleReviewLink: e.target.value })
                }
              />
            </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Automação de WhatsApp</Label>
            <p className="text-sm text-muted-foreground">
              Habilite envio automático via Evolution API ou Z-API
            </p>
          </div>
          <Switch
            checked={settings.whatsappEnabled}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, whatsappEnabled: checked })
            }
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="whatsappProviderUrl">URL do Provedor</Label>
            <Input
              id="whatsappProviderUrl"
              placeholder="https://api.exemplo.com/send"
              value={settings.whatsappProviderUrl}
              onChange={(e) =>
                setSettings({ ...settings, whatsappProviderUrl: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappProviderToken">Token/Chave</Label>
            <Input
              id="whatsappProviderToken"
              type="password"
              placeholder="********************************"
              value={settings.whatsappProviderToken}
              onChange={(e) =>
                setSettings({ ...settings, whatsappProviderToken: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappSender">Remetente/Instância</Label>
            <Input
              id="whatsappSender"
              placeholder="Número/instância do WhatsApp"
              value={settings.whatsappSender}
              onChange={(e) =>
                setSettings({ ...settings, whatsappSender: e.target.value })
              }
            />
          </div>
        </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Banner de Primeira Compra</Label>
                <p className="text-sm text-muted-foreground">
                  Exibir promoção como gatilho na Landing Page
                </p>
              </div>
              <Switch
                checked={settings.firstOrderBannerEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, firstOrderBannerEnabled: checked })
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstOrderBannerText">Texto do Banner</Label>
                <Input
                  id="firstOrderBannerText"
                  value={settings.firstOrderBannerText}
                  onChange={(e) =>
                    setSettings({ ...settings, firstOrderBannerText: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstOrderCouponCode">Código do Cupom (opcional)</Label>
                <Input
                  id="firstOrderCouponCode"
                  placeholder="Ex: PRIMEIRA10"
                  value={settings.firstOrderCouponCode}
                  onChange={(e) =>
                    setSettings({ ...settings, firstOrderCouponCode: e.target.value })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Preferências</CardTitle>
            </div>
            <CardDescription>
              Configure o comportamento do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Aceitar Pedidos</Label>
                <p className="text-sm text-muted-foreground">
                  Quando desativado, a loja aparece como fechada
                </p>
              </div>
              <Switch
                checked={settings.acceptOrders}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, acceptOrders: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificações</Label>
                <p className="text-sm text-muted-foreground">
                  Receber alertas de novos pedidos
                </p>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, notifications: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Aceite Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Aceitar pedidos automaticamente
                </p>
              </div>
              <Switch
                checked={settings.autoAccept}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoAccept: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            size="lg"
            className="gap-2"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </div>
    </div>
  )
}
