-- CreateTable
CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL,
    "client_user_id" TEXT NOT NULL,
    "service_request_id" TEXT,
    "sender_role" "Role" NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_messages_client_user_id_created_at_idx" ON "support_messages"("client_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
