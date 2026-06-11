require('dotenv').config();
const { PrismaClient } = require('./lib/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function checkSales() {
  try {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    console.log('Fecha de hoy:', todayStr);
    console.log('Buscando ventas para hoy...\n');
    
    const sales = await prisma.salesRecord.findMany({
      where: {
        saleDate: {
          gte: new Date(`${todayStr}T00:00:00.000Z`),
          lt: new Date(`${todayStr}T23:59:59.999Z`)
        }
      },
      include: {
        client: true,
        soldBy: true
      },
      orderBy: {
        saleDate: 'desc'
      }
    });
    
    console.log(`Total de ventas encontradas: ${sales.length}\n`);
    
    if (sales.length > 0) {
      sales.forEach((sale, index) => {
        console.log(`Venta ${index + 1}:`);
        console.log(`  ID: ${sale.id}`);
        console.log(`  Producto: ${sale.product}`);
        console.log(`  Monto: S/ ${sale.amount}`);
        console.log(`  Fecha: ${sale.saleDate}`);
        console.log(`  Pagado: ${sale.isPaid}`);
        console.log(`  Método de pago: ${sale.paymentMethod}`);
        console.log(`  Cliente DNI: ${sale.clientDni}`);
        console.log(`  Cliente nombre: ${sale.client?.nameComplete || 'N/A'}`);
        console.log(`  Vendido por: ${sale.soldBy?.username || 'N/A'}`);
        console.log('---');
      });
    } else {
      console.log('No hay ventas registradas para hoy');
    }
    
    // Also check all sales to see what dates exist
    console.log('\n\n=== TODAS LAS VENTAS (últimas 10) ===\n');
    const allSales = await prisma.salesRecord.findMany({
      take: 10,
      orderBy: {
        saleDate: 'desc'
      },
      include: {
        client: true
      }
    });
    
    allSales.forEach((sale, index) => {
      const saleDateStr = sale.saleDate.toISOString().split('T')[0];
      console.log(`${index + 1}. ${sale.product} - S/ ${sale.amount} - ${saleDateStr} - Pagado: ${sale.isPaid}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSales();
