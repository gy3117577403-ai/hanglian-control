<script setup lang="ts">
import { Building2 } from 'lucide-vue-next'
import { useDocumentHubStore } from '@/stores/document-hub-store'

const store = useDocumentHubStore()
</script>

<template>
  <div class="customer-grid" data-scroll-key="customers">
    <button v-for="customer in store.customers" :key="customer.customerId" type="button" @click="store.openCustomer(customer)">
      <Building2 :size="28" />
      <b>{{ customer.customerShortName }}</b>
      <span>{{ customer.customerName }}</span>
    </button>
  </div>
</template>

<style scoped>
.customer-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  height: calc(100% - 58px);
  overflow: auto;
}

button {
  display: grid;
  align-content: center;
  justify-items: start;
  min-height: 158px;
  padding: 18px;
  border: 1px solid rgba(139, 90, 42, 0.16);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 252, 245, 0.96), rgba(255, 232, 194, 0.78));
  color: #935022;
  text-align: left;
  box-shadow: 0 14px 26px rgba(80, 42, 16, 0.12);
}

b {
  margin-top: 12px;
  color: #342112;
  font-size: 24px;
  font-weight: 950;
}

span {
  margin-top: 4px;
  color: #7b542c;
  font-weight: 850;
}
</style>
