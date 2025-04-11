// File: generatePDF.jsx (with Page 2 wireframes)

import React from 'react';
import { Page, Text, View, Document, StyleSheet, pdf, Font, Svg, Path, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 12, fontFamily: 'Helvetica' },
  header: { fontSize: 18, marginBottom: 20, textAlign: 'center' },
  section: { marginBottom: 16 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 120, fontWeight: 'bold' },
  value: { flex: 1 },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    marginBottom: 4,
  },
  tableRow: { flexDirection: 'row', marginBottom: 2 },
  cell: { flex: 1, fontSize: 9 },
  cellWide: { flex: 1.5, fontSize: 9 },
  listItem: { marginLeft: 10 },
  thumbWrap: { width: '25%', padding: 5, alignItems: 'center' },
  thumbSvg: { width: 100, height: 100 },
  thumbLabel: { fontSize: 9, marginTop: 4, textAlign: 'center' },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap' }
});

function getPathFromPolygon(coords, size = 100, margin = 10) {
  const ring = coords[0];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  ring.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const scale = (size - margin * 2) / Math.max(width, height);

  const xOffset = (size - width * scale) / 2;
  const yOffset = (size - height * scale) / 2;

  return ring.map(([lng, lat], i) => {
    const x = (lng - minX) * scale + xOffset;
    const y = size - ((lat - minY) * scale + yOffset);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ') + ' Z';
}


export const generatePDFBlob = async (job) => {
const totalAcres = job.fields?.reduce((sum, field) => {
  const acres = field.acres ?? field.gpsAcres ?? 0;
  return sum + acres;
}, 0);
  const crop = job.fields?.[0]?.crop?.toLowerCase?.() || '';
console.log('📏 totalAcres:', totalAcres);

  const totalProduct = (product) => {
  const rate = parseFloat(product.rate);
  if (!rate || !totalAcres) return '';

  const unit = product.unit?.toLowerCase() || '';
  const crop = String(product.crop || '').toLowerCase();
  const totalAmount = rate * totalAcres;

  if (['seeds/acre', 'population'].includes(unit)) {
    const seedsPerUnit = crop.includes('rice') ? 900000 : crop.includes('soybean') ? 140000 : 1000000;
    const totalSeeds = rate * totalAcres;
    const units = totalSeeds / seedsPerUnit;
    return `${units.toFixed(1)} units (${seedsPerUnit.toLocaleString()} seeds/unit)`;
  }

  if (['lbs/acre', 'pounds/acre', 'bushels (45 lbs/bu)'].some(u => unit.includes(u))) {
    const lbsPerBushel = crop.includes('rice') ? 45 : crop.includes('soybean') ? 60 : 50;
    const bushels = totalAmount / lbsPerBushel;
    return `${bushels.toFixed(1)} bushels`;
  }

  // Fallback for all other units
  return `${totalAmount.toFixed(1)} ${product.unit}`;
};


  const derivedExpenseSplits = Array.isArray(job.fields)
    ? job.fields.map((f) => {
        const op = f.operator || '—';
        const lo = f.landowner || '';
        const opExp = f.operatorExpenseShare ?? 100;
        const loExp = f.landownerExpenseShare ?? 0;
        const splitSummary = loExp > 0 ? `${op}: ${opExp}% / ${lo}: ${loExp}%` : `${op}: ${opExp}%`;

        return {
          fieldName: f.fieldName,
          farmName: f.farmName,
acres: Number(f.acres ?? f.gpsAcres ?? 0),
          splitSummary,
        };
      })
    : [];

  const page1 = (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.header}>Job Order</Text>
      <View style={styles.section}>
        <View style={styles.row}><Text style={styles.label}>Date:</Text><Text style={styles.value}>{job.jobDate || '—'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Job Type:</Text><Text style={styles.value}>{job.jobType}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Status:</Text><Text style={styles.value}>{job.status || 'Planned'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Fields:</Text><Text style={styles.value}>{job.fields?.map(f => f.fieldName).join(', ')}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Total Acres:</Text><Text style={styles.value}>{totalAcres.toFixed(2)}</Text>
</View>
        <View style={styles.row}><Text style={styles.label}>Vendor:</Text><Text style={styles.value}>{job.vendor?.name || job.vendor || job.vendorName || job.products?.[0]?.vendorName || '—'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Applicator:</Text><Text style={styles.value}>{job.applicator || '—'}</Text></View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Products:</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.cell}>Name</Text>
          <Text style={styles.cell}>Rate</Text>
          <Text style={styles.cell}>Unit</Text>
          <Text style={styles.cell}>Total</Text>
        </View>
        {Array.isArray(job.products) && job.products.length > 0 ? (
          job.products.map((p, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.cell}>{p.name || p.productName || 'Unnamed'}</Text>
              <Text style={styles.cell}>{p.rate}</Text>
              <Text style={styles.cell}>{p.unit}</Text>
              <Text style={styles.cell}>{totalProduct(p)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.listItem}>—</Text>
        )}
      </View>

      {derivedExpenseSplits.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Expense Splits:</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.cell}>Field</Text>
            <Text style={styles.cell}>Farm</Text>
            <Text style={styles.cell}>Acres</Text>
            <Text style={styles.cellWide}>Split</Text>
          </View>
          {derivedExpenseSplits.map((s, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.cell}>{s.fieldName}</Text>
              <Text style={styles.cell}>{s.farmName}</Text>
              <Text style={styles.cell}>{s.acres}</Text>
              <Text style={styles.cellWide}>{s.splitSummary}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Instructions:</Text>
        <Text>{job.notes || '—'}</Text>
      </View>
    </Page>
  );

  const page2 = (
  <Page size="LETTER" style={styles.page}>
    <Text style={styles.header}>Field Maps</Text>

    <Text style={{ fontSize: 10, textAlign: 'center', marginBottom: 12 }}>
      Job Date: {job.jobDate || '—'}
    </Text>

    <View style={styles.thumbRow}>
      {job.fields?.map((f, i) => {
        if (!f.imageBase64) return null;
        return (
          <View key={f.fieldId || f.id || i} style={styles.thumbWrap}>
            <Image src={f.imageBase64} style={{ width: 100, height: 'auto' }} />
            <Text style={styles.thumbLabel}>
              {f.fieldName} ({Number(f.acres ?? f.gpsAcres).toFixed(1)} ac)
            </Text>
          </View>
        );
      })}
    </View>

    {/* 📦 Add product totals + legend in one centered block */}
    <View style={{ marginTop: 20, alignItems: 'center' }}>

      {Array.isArray(job.products) && job.products.length > 0 && (
        <View style={{ width: '100%', paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>
            Products
          </Text>
          {job.products.map((p, i) => (
            <Text key={i} style={{ fontSize: 9 }}>
              {(p.name || p.productName || 'Unnamed')} – {p.rate} {p.unit} → {totalProduct(p)}
            </Text>
          ))}
        </View>
      )}

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 20 }}>
          <View style={{ width: 10, height: 10, backgroundColor: '#34D399', marginRight: 4 }} />
          <Text style={{ fontSize: 9 }}>Apply</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 10, height: 10, backgroundColor: '#F87171', marginRight: 4 }} />
          <Text style={{ fontSize: 9 }}>Do Not Apply</Text>
        </View>
      </View>
    </View>
  </Page>
);


  const doc = <Document>{[page1, page2]}</Document>;
  const blob = await pdf(doc).toBlob();
  return blob;
};
