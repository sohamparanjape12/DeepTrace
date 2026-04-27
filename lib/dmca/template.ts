import { NoticeInput } from './types';

export const STATUTORY_GOOD_FAITH =
  "I have a good faith belief that the use of the material described above is not authorized by the copyright owner, its agent, or the law.";

export const STATUTORY_PERJURY =
  "I swear, under penalty of perjury, that the information in this notification is accurate and that I am the copyright owner, or am authorized to act on behalf of the owner, of an exclusive right that is allegedly infringed.";

export function renderNotice(input: NoticeInput): { subject: string; body: string } {
  const subject = `Notice of Copyright Infringement - ${input.customer_org_name}`;
  
  let body = `Dear ${input.agent_name || 'Copyright Agent'},\n\n`;
  body += `This letter is a Notice of Infringement as authorized in § 512(c) of the U.S. Copyright Law under the Digital Millennium Copyright Act (DMCA).\n\n`;

  body += `1. Identification of Work\n`;
  body += `${input.work_description}\n`;
  body += `Original URL: ${input.original_url}\n\n`;

  body += `2. Identification of Infringing Material\n`;
  body += `${input.infringement_description}\n`;
  body += `Infringing URL: ${input.infringing_url}\n\n`;

  body += `3. Evidence Summary\n`;
  body += `${input.evidence_summary}\n\n`;

  if (input.optional_context_note && input.optional_context_note.trim().length > 0) {
    body += `Context Note:\n${input.optional_context_note}\n\n`;
  }

  body += `4. Good Faith Statement\n`;
  body += `${STATUTORY_GOOD_FAITH}\n\n`;

  body += `5. Accuracy and Perjury Declaration\n`;
  body += `${STATUTORY_PERJURY}\n\n`;

  body += `6. Signature\n`;
  body += `Electronically signed:\n/s/ ${input.signature}\n`;
  body += `${input.customer_org_name}\n`;
  body += `${new Date().toISOString().split('T')[0]}`;

  return { subject, body };
}
