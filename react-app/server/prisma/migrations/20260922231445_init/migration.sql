-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "email_encrypted" TEXT NOT NULL,
    "email_hash" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni_encrypted" TEXT NOT NULL,
    "dni_hash" TEXT NOT NULL,
    "dni_last4" TEXT NOT NULL,
    "cuit_encrypted" TEXT,
    "cuit_hash" TEXT,
    "sexo" TEXT NOT NULL,
    "tramite_hash" TEXT,
    "telefono_encrypted" TEXT,
    "fecha_nacimiento" DATETIME,
    "renaper_verified" BOOLEAN NOT NULL DEFAULT false,
    "renaper_verified_at" DATETIME,
    "renaper_status" TEXT NOT NULL DEFAULT 'PENDING',
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "consent_version" TEXT,
    "consent_at" DATETIME,
    "privacy_accepted_at" DATETIME,
    "twofa_enabled" BOOLEAN NOT NULL DEFAULT true,
    "twofa_secret" TEXT,
    "twofa_expires_at" DATETIME,
    "twofa_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verify_code" TEXT,
    "email_verify_expires" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'CABA',
    "price" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disponible',
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "area_m2" REAL,
    "images" TEXT,
    "owner_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Property_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "property_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "rent_amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "deposit" REAL,
    "status" TEXT NOT NULL DEFAULT 'vigente',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contract_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "Property" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contract_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contract_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contract_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "due_date" DATETIME NOT NULL,
    "paid_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "method" TEXT,
    "receipt_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contract" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entity_id" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TwoFactorCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email_hash" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_hash_key" ON "User"("email_hash");

-- CreateIndex
CREATE UNIQUE INDEX "User_dni_hash_key" ON "User"("dni_hash");

-- CreateIndex
CREATE UNIQUE INDEX "User_cuit_hash_key" ON "User"("cuit_hash");
