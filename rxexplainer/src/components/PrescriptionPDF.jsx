import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', backgroundColor: '#ffffff', padding: 0 },
  header: { backgroundColor: '#0f1923', padding: '20 24 16 24' },
  headerTitle: { fontSize: 22, color: '#7ec8a4', fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  headerSub: { fontSize: 9, color: '#8a9bb0', marginBottom: 4 },
  headerDate: { fontSize: 8, color: '#8a9bb0' },
  divider: { height: 1, backgroundColor: '#7ec8a4', marginHorizontal: 24, marginVertical: 12 },
  metaRow: { flexDirection: 'row', marginHorizontal: 24, marginVertical: 12, gap: 12 },
  metaBox: { flex: 1, backgroundColor: '#1a2535', borderRadius: 6, padding: '12 14' },
  metaLabel: { fontSize: 8, color: '#7ec8a4', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  metaValue: { fontSize: 13, color: '#e8e0d5', fontFamily: 'Helvetica-Bold' },
  sectionTitle: { fontSize: 14, color: '#7ec8a4', fontFamily: 'Helvetica-Bold', marginHorizontal: 24, marginTop: 8, marginBottom: 4 },
  bodyText: { fontSize: 10, color: '#333333', lineHeight: 1.7, marginHorizontal: 24, marginTop: 8 },
  footer: { position: 'absolute', bottom: 16, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#8a9bb0' },
  preparedFor: { fontSize: 9, color: '#8a9bb0', marginHorizontal: 24, marginBottom: 4 },
})

function PrescriptionDoc({ medicine, dosage, ageGroup, response, userName }) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💊 Rx Explainer</Text>
          <Text style={styles.headerSub}>Understand your prescription in plain language</Text>
          <Text style={styles.headerDate}>Generated: {date}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.preparedFor}>Prepared for: {userName} · Age Group: {ageGroup}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Medicine Name</Text>
            <Text style={styles.metaValue}>{medicine}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>Dosage</Text>
            <Text style={styles.metaValue}>{dosage || 'Not specified'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>AI Explanation</Text>
        <Text style={styles.bodyText}>{response}</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>AI-generated — not a substitute for professional medical advice.</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
        </View>
      </Page>
    </Document>
  )
}

export async function downloadPDF({ medicine, dosage, ageGroup, response, userName }) {
  const doc = <PrescriptionDoc medicine={medicine} dosage={dosage} ageGroup={ageGroup} response={response} userName={userName} />
  const blob = await pdf(doc).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Rx_${medicine}_Explanation.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
