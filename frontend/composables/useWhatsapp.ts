import { ref } from 'vue'
import type { Ref } from 'vue'
import { GET_ACTIVE_CHANNEL } from '~/graphql/queries/settings'

/**
 * Composable for store contact info pulled from the active Channel custom fields:
 * - WhatsApp number (also builds a click-to-chat URL)
 * - GitHub link
 * - Owner email
 *
 * Available via the Shop API `activeChannel` query (NOT globalSettings).
 */
export function useWhatsapp() {
  const whatsappNumber: Ref<string | null> = ref(null)
  const githubLink: Ref<string | null> = ref(null)
  const ownerEmail: Ref<string | null> = ref(null)
  const loading: Ref<boolean> = ref(false)
  const fetched: Ref<boolean> = ref(false)

  async function fetchWhatsappNumber(): Promise<void> {
    if (fetched.value) return // already fetched
    loading.value = true
    try {
      const { $apollo } = useNuxtApp()
      const { data } = await $apollo.defaultClient.query({
        query: GET_ACTIVE_CHANNEL,
        fetchPolicy: 'cache-first',
      })
      const cf = data?.activeChannel?.customFields
      whatsappNumber.value = cf?.whatsappNumber || null
      githubLink.value = cf?.githubLink || null
      ownerEmail.value = cf?.ownerEmail || null
    } catch {
      whatsappNumber.value = null
      githubLink.value = null
      ownerEmail.value = null
    } finally {
      loading.value = false
      fetched.value = true
    }
  }

  // Alias for clarity when used for general contact info
  const fetchChannelContact = fetchWhatsappNumber

  /**
   * Build a WhatsApp click-to-chat URL with a pre-filled message.
   * @param productName - The product name to include in the message
   * @param productUrl - The full URL of the product page
   */
  function buildWhatsappUrl(productName: string, productUrl: string): string {
    if (!whatsappNumber.value) return ''
    const message = `Halo, saya tertarik dengan produk *${productName}*.\n\n${productUrl}\n\nBoleh tanya-tanya dulu?`
    const encoded = encodeURIComponent(message)
    const cleanNumber = whatsappNumber.value.replace(/\D/g, '')
    return `https://wa.me/${cleanNumber}?text=${encoded}`
  }

  return {
    whatsappNumber,
    githubLink,
    ownerEmail,
    loading,
    fetchWhatsappNumber,
    fetchChannelContact,
    buildWhatsappUrl,
  }
}
