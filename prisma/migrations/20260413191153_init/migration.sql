-- CreateTable
CREATE TABLE "Client" (
    "dni" INTEGER NOT NULL,
    "nameComplete" TEXT NOT NULL,
    "joinDate" TIMESTAMP(3) NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL,
    "mode" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "turn" TEXT NOT NULL,
    "debt" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("dni")
);

-- CreateTable
CREATE TABLE "SalesRecord" (
    "id" SERIAL NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "product" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "clientDni" INTEGER NOT NULL,

    CONSTRAINT "SalesRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Boleta" (
    "id" SERIAL NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL,
    "product" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "clientDni" INTEGER NOT NULL,

    CONSTRAINT "Boleta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Factura" (
    "id" SERIAL NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "supplierName" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "scheduled" TIMESTAMP(3) NOT NULL,
    "clientDni" INTEGER NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SalesRecord" ADD CONSTRAINT "SalesRecord_clientDni_fkey" FOREIGN KEY ("clientDni") REFERENCES "Client"("dni") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Boleta" ADD CONSTRAINT "Boleta_clientDni_fkey" FOREIGN KEY ("clientDni") REFERENCES "Client"("dni") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientDni_fkey" FOREIGN KEY ("clientDni") REFERENCES "Client"("dni") ON DELETE CASCADE ON UPDATE CASCADE;
