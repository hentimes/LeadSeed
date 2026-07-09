import { db } from '../db/database';

export async function seedTemplatesIfEmpty(): Promise<void> {
  const [waCount, emailCount] = await Promise.all([
    db.whatsappTemplates.count(),
    db.emailTemplates.count(),
  ]);

  const now = new Date().toISOString();

  if (waCount === 0) {
    await db.whatsappTemplates.bulkAdd([
      {
        nombre: 'Bienvenida',
        contenido: 'Hola {nombre}, gracias por contactarnos. Soy del equipo de ventas. ¿En qué podemos ayudarte?',
        templateListIds: [],
        leadIds: [],
        leadListIds: [],
        createdAt: now,
      },
      {
        nombre: 'Seguimiento',
        contenido: 'Hola {nombre}, pasaba para saber cómo vas con la información que te enviamos. Quedamos atentos a cualquier duda.',
        templateListIds: [],
        leadIds: [],
        leadListIds: [],
        createdAt: now,
      },
      {
        nombre: 'Propuesta',
        contenido: 'Hola {nombre}, te comparto la propuesta que hablamos. Podés revisarla y cualquier cosa me avisas. ¡Saludos!',
        templateListIds: [],
        leadIds: [],
        leadListIds: [],
        createdAt: now,
      },
    ]);
  }

  if (emailCount === 0) {
    await db.emailTemplates.bulkAdd([
      {
        nombre: 'Bienvenida Email',
        asunto: 'Gracias por contactarnos, {nombre}',
        contenido: '<p>Hola <strong>{nombre}</strong>,</p><p>Gracias por contactarnos. Nos comunicaremos pronto para conocer tus necesidades.</p><p>Saludos,<br>Equipo de Ventas</p>',
        isHtml: true,
        templateListIds: [],
        leadIds: [],
        leadListIds: [],
        createdAt: now,
      },
      {
        nombre: 'Propuesta Comercial',
        asunto: 'Propuesta para {empresa}',
        contenido: 'Estimado/a {nombre},\n\nAdjunto la propuesta comercial para {empresa}.\n\nQuedamos atentos a tus comentarios.\n\nSaludos.',
        isHtml: false,
        templateListIds: [],
        leadIds: [],
        leadListIds: [],
        createdAt: now,
      },
    ]);
  }
}
