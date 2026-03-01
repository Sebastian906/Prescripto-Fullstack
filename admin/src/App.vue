<script setup>
import { provideAppContext } from './context/AppContext';
import { provideAdminContext } from './context/AdminContext';
import { provideDoctorContext } from './context/DoctorContext';
import AppLayout from './AppLayout.vue';

provideAppContext()
provideAdminContext()
provideDoctorContext()

</script>

<template>
  <AppLayout />
</template>