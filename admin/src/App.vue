<script setup>
import { provideAppContext } from './context/AppContext';
import { provideAdminContext } from './context/AdminContext';
import { provideDoctorContext } from './context/DoctorContext';
import { RouterView } from 'vue-router';
import Login from './pages/Login.vue';

provideAppContext()
provideAdminContext()
provideDoctorContext()
</script>

<template>
  <RouterView />
  <Login />
</template>