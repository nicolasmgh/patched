const fs = require('fs'); let s = fs.readFileSync('apps/api/prisma/schema.prisma', 'utf8'); s = s.replace(/model Notification \\{[\s\S]*?\\}/, \model Notification {
  id        String           @id @default(uuid())
  type      NotificationType
  message   String
  data      Json?
  read      Boolean          @default(false)
  userId    String
  user      User             @relation(fields: [userId], references: [id])
  createdAt DateTime         @default(now())
}\); fs.writeFileSync('apps/api/prisma/schema.prisma', s);
