import { ref } from 'vue'
import type { Ref } from 'vue'
import { GET_ACTIVE_CHANNEL } from '~/graphql/queries/settings'

/**
 * Composable for WhatsApp contact functionality.
 * Fetches the owner's WhatsApp number from the active Channel custom fields
 * (available via Shop API) and generates a pre-filled WhatsApp message link.
 */
export function useWhatsapp() {
  const whatsappNumber: Ref<string | null> = ref(null)
  const loading: Ref<boolean> = ref(false)

  async function fetchWhatsappNumber(): Promise<void> {
    if (whatsappNumber.value !== null) return // already fetched
    loading.value = true
    try {
      const { $apollo } = useNuxtApp()
      const { data } = await $apollo.defaultClient.query({
        query: GET_ACTIVE_CHANNEL,
        fetchPolicy: 'cache-first',
      })
      whatsappNumber.value = data?.activeChannel?.customFields?.whatsappNumber || null
    } catch {
      whatsappNumber.value = null
    } finally {
      loading.value = false
    }
  }

  /**
   * Build a WhatsApp click-to-chat URL with a pre-filled message.
   * @param productName - The product name to include in the message
   * @param productUrl - The full URL of the product page
   */
  function buildWhatsappUrl(productName: string, productUrl: string): string {
    if (!whatsappNumber.value) return ''
    const message = `Halo, saya tertarik dengan produk *${productName}*.\n\n${productUrl}\n\nBoleh tanya-tanya dulu?`
    const encoded = encodeURIComponent(message)
    // Remove any non-digit characters from the number
    const cleanNumber = whatsappNumber.value.replace(/\D/g, '')
    return `https://wa.me/${cleanNumber}?text=${encoded}`
  }

  return {
    whatsappNumber,
    loading,
    fetchWhatsappNumber,
    buildWhatsappUrl,
  }
}
