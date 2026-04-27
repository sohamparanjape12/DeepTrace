import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { NoticeInput } from './types';
import { v2 as cloudinary } from 'cloudinary';
import { STATUTORY_GOOD_FAITH, STATUTORY_PERJURY } from './template';
import React from 'react';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.5 },
  header: { fontSize: 16, fontWeight: 'bold', marginBottom: 20 },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 5 },
  text: { marginBottom: 5 },
  bullet: { marginLeft: 10, marginBottom: 5 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 9, color: 'gray', borderTop: '1px solid #eaeaea', paddingTop: 10 }
});

export const NoticePDF = ({ input, date }: { input: NoticeInput; date: string }) => (
  <Document>
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.header}>Notice of Copyright Infringement - {input.customer_org_name}</Text>
      
      <View style={styles.section}>
        <Text style={styles.text}>Dear {input.agent_name || 'Copyright Agent'},</Text>
        <Text style={styles.text}>This letter is a Notice of Infringement as authorized in § 512(c) of the U.S. Copyright Law under the Digital Millennium Copyright Act (DMCA).</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Identification of Work</Text>
        <Text style={styles.text}>{input.work_description}</Text>
        <Text style={styles.text}>Original URL: {input.original_url}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Identification of Infringing Material</Text>
        <Text style={styles.text}>{input.infringement_description}</Text>
        <Text style={styles.text}>Infringing URL: {input.infringing_url}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Evidence Summary</Text>
        {input.evidence_summary.split('\n').map((bullet, i) => (
          <Text key={i} style={styles.bullet}>{bullet}</Text>
        ))}
        {input.optional_context_note && (
           <Text style={[styles.text, {marginTop: 10}]}>Context: {input.optional_context_note}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Good Faith Statement</Text>
        <Text style={styles.text}>{STATUTORY_GOOD_FAITH}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Accuracy and Perjury Declaration</Text>
        <Text style={styles.text}>{STATUTORY_PERJURY}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Signature</Text>
        <Text style={styles.text}>Electronically signed: /s/ {input.signature}</Text>
        <Text style={styles.text}>{input.customer_org_name}</Text>
        <Text style={styles.text}>{date}</Text>
      </View>

      <Text style={styles.footer}>DeepTrace Forensic Content Audit Report</Text>
    </Page>
  </Document>
);

export async function generateAndUploadPDF(input: NoticeInput, customerId: string, noticeId: string): Promise<{ url: string, buffer: Buffer }> {
  const date = new Date().toISOString().split('T')[0];
  
  const pdfBuffer = await renderToBuffer(<NoticePDF input={input} date={date} />);
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `dmca/${customerId}`,
        public_id: noticeId,
        resource_type: 'raw',
        format: 'pdf',
        access_mode: 'public',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve({ url: result!.secure_url, buffer: pdfBuffer });
      }
    );
    
    uploadStream.end(pdfBuffer);
  });
}
