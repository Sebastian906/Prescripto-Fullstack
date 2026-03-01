<script setup>
import { provideAppContext } from './context/AppContext';
import { provideAdminContext } from './context/AdminContext';
import { provideDoctorContext } from './context/DoctorContext';
import { RouterView } from 'vue-router';

provideAppContext()
provideAdminContext()
provideDoctorContext()

</script>

<template>
  <RouterView />
</template>