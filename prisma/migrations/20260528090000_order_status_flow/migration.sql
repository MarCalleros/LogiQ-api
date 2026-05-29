-- Rebuild the enum so legacy values map cleanly to the new workflow states
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;

ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";

CREATE TYPE "OrderStatus" AS ENUM (
	'SIN_ASIGNAR',
	'POR_RECOGER',
	'ENTREGANDO',
	'ENTREGADO',
	'CANCELADO',
	'NO_SE_PUDO_ENTREGAR'
);

ALTER TABLE "orders"
ALTER COLUMN "status" TYPE "OrderStatus"
USING (
	CASE "status"::text
		WHEN 'PENDIENTE' THEN 'SIN_ASIGNAR'
		WHEN 'ASIGNADO' THEN 'POR_RECOGER'
		ELSE "status"::text
	END::"OrderStatus"
);

DROP TYPE "OrderStatus_old";

ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'SIN_ASIGNAR';