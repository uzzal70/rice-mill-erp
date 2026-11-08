CREATE TYPE "BusinessMode" AS ENUM (
    'PADDY_TRADING',
    'RICE_TRADING',
    'WHOLESALE',
    'RETAIL',
    'DEALER_DISTRIBUTION',
    'TOLL_MILLING'
);

ALTER TABLE "Factory"
ADD COLUMN "businessModes" "BusinessMode"[] NOT NULL DEFAULT ARRAY[]::"BusinessMode"[];
