<template>
  <div ref="container" class="lottie-container" />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(
  defineProps<{
    src: string
    loop?: boolean
    autoplay?: boolean
    speed?: number
  }>(),
  { loop: true, autoplay: true, speed: 1 },
)

const container = ref<HTMLElement | null>(null)
let player: any = null

onMounted(async () => {
  const { DotLottieWC } = await import('@lottiefiles/dotlottie-wc')

  if (!container.value) return

  // DotLottieWC is a web component; create and append it.
  player = new DotLottieWC()
  player.setAttribute('src', props.src)
  if (props.loop) player.setAttribute('loop', '')
  if (props.autoplay) player.setAttribute('autoplay', '')
  player.setAttribute('speed', String(props.speed))
  player.style.width = '100%'
  player.style.height = '100%'
  container.value.appendChild(player)
})

onBeforeUnmount(() => {
  if (player && container.value?.contains(player)) {
    container.value.removeChild(player)
  }
})
</script>

<style scoped>
.lottie-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
