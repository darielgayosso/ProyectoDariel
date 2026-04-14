import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  return (
    <div className="bg-slate-50 min-h-screen">
      <Navbar />
      <div className="flex pt-16">
        <Sidebar  />
        <div className="flex-1 w-full bg-slate-50 min-h-screen md:ml-64 p-4 lg:p-8">
            <Outlet />
        </div>
      </div>
    </div>
  );
}
