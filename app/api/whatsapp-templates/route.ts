import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  WhatsAppTemplateType,
  getDefaultTemplateContent,
  getDefaultTemplateName,
} from "@/lib/whatsapp-templates";
import { z } from "zod";

const allTypes: WhatsAppTemplateType[] = [
  "SCHEDULE",
  "PARTICIPANT_REGISTERED_NEW",
  "PARTICIPANT_REGISTERED_EXISTING",
  "ANNOUNCEMENT",
];

// GET /api/whatsapp-templates?tripId=xxx
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tripId = searchParams.get("tripId")?.trim();

    if (!tripId) {
      return NextResponse.json(
        { ok: false, message: "tripId wajib diisi" },
        { status: 400 }
      );
    }

    const rows = await prisma.whatsAppTemplate.findMany({
      where: { tripId },
    });

    const items = allTypes.map((type) => {
      const found = rows.find((r) => r.type === type);
      return {
        type,
        name: found?.name ?? getDefaultTemplateName(type),
        content: found?.content ?? "",
        defaultContent: getDefaultTemplateContent(type),
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error("GET /api/whatsapp-templates error", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}

const SaveSchema = z.object({
  tripId: z.string().trim().min(1),
  templates: z
    .array(
      z.object({
        type: z.enum([
          "SCHEDULE",
          "PARTICIPANT_REGISTERED_NEW",
          "PARTICIPANT_REGISTERED_EXISTING",
          "ANNOUNCEMENT",
        ] as const),
        name: z.string().trim().optional(),
        content: z.string().trim(),
      })
    )
    .min(1),
});

// PUT /api/whatsapp-templates
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const data = SaveSchema.parse(body);

    const { tripId, templates } = data;

    for (const t of templates) {
      const type = t.type as WhatsAppTemplateType;
      const name =
        t.name && t.name.length > 0 ? t.name : getDefaultTemplateName(type);

      await prisma.whatsAppTemplate.upsert({
        where: {
          tripId_type: {
            tripId,
            type,
          },
        },
        create: {
          tripId,
          type,
          name,
          content: t.content,
        },
        update: {
          name,
          content: t.content,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("PUT /api/whatsapp-templates error", e);
    if (e?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, message: "Validasi gagal", issues: e.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Internal Error" },
      { status: 500 }
    );
  }
}
