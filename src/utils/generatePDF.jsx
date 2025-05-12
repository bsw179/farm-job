// File: generatePDF.jsx (Updated with field-level splits, 4-per-row maps)

import React from 'react';
import {
  Page, Text, View, Document, StyleSheet, pdf, Image
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'Helvetica' },
  header: { fontSize: 14, marginBottom: 12, textAlign: 'center', fontWeight: 'bold' },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 70, fontWeight: 'bold' },
  tightRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  section: { marginBottom: 10 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 2 },
  tableRow: { flexDirection: 'row', paddingVertical: 2 },
  shadedRow: { backgroundColor: '#f2f2f2' },
  cell: { flex: 1 },
  cellWide: { flex: 2 },
  bold: { fontWeight: 'bold' },
  legendBox: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  colorBox: { width: 10, height: 10, marginRight: 4 },
  mapGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  mapWrap: { width: '23%', margin: '1%', alignItems: 'center' },
  thumb: { width: 100, height: 100 },
  thumbLabel: { fontSize: 9, marginTop: 4, textAlign: 'center' }
});

const totalProduct = (product, acres, water) => {
  const rate = parseFloat(product.rate);
  if (!rate || !acres) return '';
  const unit = (product.unit || '').toLowerCase();
  const crop = (product.crop || '').toLowerCase();
  const totalAmount = rate * acres;
  const type = product.type || product.productType || ''; // 🛠 catch fertilizer vs seed properly

  if (['seeds/acre', 'population'].includes(unit)) {
    const seedsPerUnit = crop.includes('rice') ? 900000 : crop.includes('soybean') ? 140000 : 1000000;
    const totalSeeds = rate * acres;
    const units = totalSeeds / seedsPerUnit;
    return `${units.toFixed(1)} units (${seedsPerUnit.toLocaleString()} seeds/unit)`;

  } else if (unit === 'lbs/acre') {
    if (type === 'Seed') {
      const lbsPerBushel = crop.includes('rice') ? 45 : crop.includes('soybean') ? 60 : 50;
      const bushels = totalAmount / lbsPerBushel;
      return `${bushels.toFixed(1)} bushels`;
    } else {
      const tons = totalAmount / 2000;
      return `${totalAmount.toFixed(1)} lbs (${tons.toFixed(2)} tons)`;
    }

  } else if (unit === 'fl oz/acre') {
    const gal = totalAmount / 128;
    return `${gal.toFixed(2)} gallons`;

  } else if (unit === 'pt/acre') {
    const gal = totalAmount / 8;
    return `${gal.toFixed(2)} gallons`;

  } else if (unit === 'qt/acre') {
    const gal = totalAmount / 4;
    return `${gal.toFixed(2)} gallons`;

  } else if (unit === 'oz dry/acre') {
    const lbs = totalAmount / 16;
    return `${lbs.toFixed(2)} lbs`;

  } else if (unit === '%v/v') {
    if (!water || isNaN(water)) {
      return 'Missing water volume';
    }
    const gal = (rate / 100) * water * acres;
    return `${gal.toFixed(2)} gallons`;

  } else if (unit === 'tons/acre') {
    return `${totalAmount.toFixed(2)} tons`;

  } else {
    return `${totalAmount.toFixed(1)} ${unit.replace('/acre', '').trim()}`;
  }
};


export const generatePDFBlob = async (job) => {
  const totalAcres = job.fields?.reduce((sum, f) => sum + (f.acres ?? f.gpsAcres ?? 0), 0);
  const waterVolume = parseFloat(job.waterVolume || 0);

  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.tightRow}>
          <View>
            <Text style={styles.bold}>Date:</Text>
            <Text>{job.jobDate || '—'}</Text>
            <Text style={{ marginTop: 2 }}>{job.operator || ''}</Text>
          </View>
          <Text style={styles.header}>Job Order</Text>
          <View><Text> </Text></View>
        </View>

        <View style={styles.section}>
          <View style={styles.tightRow}>
            <Text><Text style={styles.bold}>Vendor:</Text> {job.vendor || '—'}</Text>
            <Text><Text style={styles.bold}>Applicator:</Text> {job.applicator || '—'}</Text>
          </View>
        </View>

        <Text style={[styles.bold, { marginBottom: 4 }]}>Total Acres: {totalAcres.toFixed(2)}</Text>

        {/* Products */}
        <View style={styles.section}>
          <Text style={[styles.bold, { marginBottom: 4 }]}>Products:</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.cellWide}>Name</Text>
            <Text style={styles.cell}>Rate</Text>
            <Text style={styles.cell}>Total</Text>
          </View>
          {job.products?.map((p, i) => (
            <View
              key={i}
              style={[styles.tableRow, i % 2 === 1 ? styles.shadedRow : null]}
            >
              <Text style={styles.cellWide}>{p.name || p.productName || 'Unnamed'}</Text>
<Text style={styles.cell}>
  {(() => {
    const unit = (p.unit || '').toLowerCase();
    const rate = parseFloat(p.rate) || 0;
    if (unit === '%v/v') {
      return `${rate}% v/v`;
    }
    if (['seeds/acre', 'population'].includes(unit)) {
      const prettyRate = rate >= 1000 ? `${(rate/1000).toFixed(1)}k` : rate;
      return `${prettyRate} seeds/acre`;
    }
    return `${rate} ${unit}`;
  })()}
</Text>
              <Text style={styles.cell}>{totalProduct(p, totalAcres, waterVolume)}</Text>
            </View>
          ))}
        </View>

        {/* Comments */}
        {job.notes && (
          <View style={[styles.section, { marginTop: 6 }]}>
            <Text style={[styles.bold, { marginBottom: 2 }]}>Comments/Instructions:</Text>
            <Text>{job.notes}</Text>
          </View>
        )}

        {/* Legend */}
        <View style={styles.legendBox}>
          <View style={styles.legendItem}>
            <View style={[styles.colorBox, { backgroundColor: '#34D399' }]} />
            <Text>Apply</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.colorBox, { backgroundColor: '#F87171' }]} />
            <Text>Do Not Apply</Text>
          </View>
        </View>

        {/* Field Maps with split info */}
        <View style={styles.mapGrid}>
          {job.fields?.map((f, i) => {
            if (!f.imageBase64) return null;

const op = f.operator || '—';
const lo = f.landowner || '—';
const opShare = typeof f.operatorExpenseShare === 'number' ? f.operatorExpenseShare : 100;
const loShare = typeof f.landownerExpenseShare === 'number' ? f.landownerExpenseShare : 0;

let split = '';

if (opShare > 0) split += `${op}: ${opShare}%`;
if (loShare > 0) split += `${split ? '\n' : ''}${lo}: ${loShare}%`;

if (!split) split = `${op}:`; // Fallback if nothing valid


            return (
              <View key={i} style={styles.mapWrap}>
                <Image src={f.imageBase64} style={styles.thumb} />
                <Text style={styles.thumbLabel}>{f.fieldName} ({Number(f.acres).toFixed(1)} ac)</Text>
                <Text style={styles.thumbLabel}>{split}</Text>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  return blob;
};



export const generateBatchPDF = async (jobsArray) => {
  const mergedJob = {
    ...jobsArray[0], // Use first job's base info (date, vendor, applicator)
    fields: jobsArray.flatMap((j) => j.fields || []),
    products: jobsArray.flatMap((j) => j.products || []),
    notes: jobsArray
      .map((j) => j.notes)
      .filter(Boolean)
      .join("\n"),
  };

  const totalAcres = mergedJob.fields?.reduce(
    (sum, f) => sum + (f.acres ?? f.gpsAcres ?? 0),
    0
  );

  const waterVolume = parseFloat(mergedJob.waterVolume || 0);
const uniqueProducts = Array.from(
  new Map(
    mergedJob.products.map((p) => [`${p.productId}_${p.rate}_${p.unit}`, p])
  ).values()
);

  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.tightRow}>
          <View>
            <Text style={styles.bold}>Date:</Text>
            <Text>{mergedJob.jobDate || "—"}</Text>
            <Text style={{ marginTop: 2 }}>{mergedJob.operator || ""}</Text>
          </View>
          <Text style={styles.header}>Job Order</Text>
          <View>
            <Text> </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.tightRow}>
            <Text>
              <Text style={styles.bold}>Vendor:</Text> {mergedJob.vendor || "—"}
            </Text>
            <Text>
              <Text style={styles.bold}>Applicator:</Text>{" "}
              {mergedJob.applicator || "—"}
            </Text>
          </View>
        </View>

        <Text style={[styles.bold, { marginBottom: 4 }]}>
          Total Acres: {totalAcres?.toFixed(2) || "0.00"}
        </Text>

        {/* Products */}
        <View style={styles.section}>
          <Text style={[styles.bold, { marginBottom: 4 }]}>Products:</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.cellWide}>Name</Text>
            <Text style={styles.cell}>Rate</Text>
            <Text style={styles.cell}>Total</Text>
          </View>
          {uniqueProducts.map((p, i) => (
            <View
              key={i}
              style={[styles.tableRow, i % 2 === 1 ? styles.shadedRow : null]}
            >
              <Text style={styles.cellWide}>
                {p.name || p.productName || "Unnamed"}
              </Text>
              <Text style={styles.cell}>
                {(() => {
                  const unit = (p.unit || "").toLowerCase();
                  const rate = parseFloat(p.rate) || 0;
                  if (unit === "%v/v") return `${rate}% v/v`;
                  if (["seeds/acre", "population"].includes(unit)) {
                    const prettyRate =
                      rate >= 1000 ? `${(rate / 1000).toFixed(1)}k` : rate;
                    return `${prettyRate} seeds/acre`;
                  }
                  return `${rate} ${unit}`;
                })()}
              </Text>
              <Text style={styles.cell}>
                {totalProduct(p, totalAcres, waterVolume)}
              </Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        {mergedJob.notes && (
          <View style={[styles.section, { marginTop: 6 }]}>
            <Text style={[styles.bold, { marginBottom: 2 }]}>
              Comments/Instructions:
            </Text>
            <Text>{mergedJob.notes}</Text>
          </View>
        )}

        {/* Legend */}
        <View style={styles.legendBox}>
          <View style={styles.legendItem}>
            <View style={[styles.colorBox, { backgroundColor: "#34D399" }]} />
            <Text>Apply</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.colorBox, { backgroundColor: "#F87171" }]} />
            <Text>Do Not Apply</Text>
          </View>
        </View>

        {/* Maps */}
        <View style={styles.mapGrid}>
          {mergedJob.fields.map((f, i) => {
            if (!f.imageBase64) return null;

            const op = f.operator || "—";
            const lo = f.landowner || "—";
            const opShare =
              typeof f.operatorExpenseShare === "number"
                ? f.operatorExpenseShare
                : 100;
            const loShare =
              typeof f.landownerExpenseShare === "number"
                ? f.landownerExpenseShare
                : 0;

            let split = "";
            if (opShare > 0) split += `${op}: ${opShare}%`;
            if (loShare > 0) split += `${split ? "\n" : ""}${lo}: ${loShare}%`;
            if (!split) split = `${op}:`;

            return (
              <View key={i} style={styles.mapWrap}>
                <Image src={f.imageBase64} style={styles.thumb} />
                <Text style={styles.thumbLabel}>
                  {f.fieldName} ({Number(f.acres).toFixed(1)} ac)
                </Text>
                <Text style={styles.thumbLabel}>{split}</Text>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(doc).toBlob();
  return blob;
};

