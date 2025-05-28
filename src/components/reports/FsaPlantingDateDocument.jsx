// src/components/reports/FsaPlantingDateDocument.jsx
import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    lineHeight: 1.6,
  },
  header: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  operatorTitle: {
    fontSize: 12,
    marginTop: 20,
    marginBottom: 8,
    fontWeight: "bold",
    color: "#1d4ed8",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderColor: "#d1d5db",
    paddingBottom: 2,
  },
  fieldBlock: {
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 0.5,
    borderColor: "#e5e7eb",
  },
});

const FsaPlantingDateDocument = ({ groupedFields, cropYear }) => (
  <Document>
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.header}>FSA Planting Date Report – {cropYear}</Text>

      {Object.entries(groupedFields).map(([operator, farms]) => (
        <View key={operator} wrap={false}>
          <Text style={styles.operatorTitle}>{operator}</Text>

          {Object.entries(farms).map(([farmKey, tracts]) => {
            const [farmNumber, farmName] = farmKey.split("__");
            return (
              <View key={farmKey}>
                <Text style={styles.sectionTitle}>
                  Farm {farmNumber} ({farmName})
                </Text>

                {Object.entries(tracts).map(([tractNumber, fields]) => (
                  <View key={tractNumber}>
                    <Text style={styles.sectionTitle}>Tract {tractNumber}</Text>

                    {fields.map((field) => {
                      const plantingJobs = field.jobs
                        ?.filter(
                          (j) =>
                            j.cropYear === cropYear &&
                            j.jobType?.parentName === "Seeding" &&
                            !["Seed and Pack", "Pack"].includes(
                              j.jobType?.name || ""
                            )
                        )
                        .sort(
                          (a, b) => new Date(a.jobDate) - new Date(b.jobDate)
                        );

                      const plantingDate =
                        plantingJobs?.length > 0
                          ? new Date(
                              plantingJobs[0].jobDate
                            ).toLocaleDateString()
                          : "—";

                      const rentShares = [
                        {
                          name: operator,
                          share: field.operatorRentShare || 0,
                        },
                        ...(field.landowners?.length > 0
                          ? field.landowners.map((l) => ({
                              name: l.name,
                              share: l.rentShare,
                            }))
                          : [
                              {
                                name: field.landowner || "—",
                                share: field.landownerRentShare || 0,
                              },
                            ]),
                      ];

                      return (
                        <View key={field.id} style={styles.fieldBlock}>
                          <Text>
                            FSA Field #: {field.fsaFieldNumber || "—"} (
                            {field.fieldName || "—"})
                          </Text>
                          <Text>Crop: {field.cropData?.crop || "—"}</Text>
                          <Text>Outcome: {field.cropData?.outcome || "—"}</Text>
                          <Text>FSA Acres: {field.fsaAcres || "—"}</Text>
                          <Text>Planting Date: {plantingDate}</Text>
                          <Text>
                            Rent Shares:{" "}
                            {rentShares
                              .map(
                                (r) =>
                                  `${r.name?.trim()}: ${Number(
                                    r.share || 0
                                  ).toFixed(2)}%`
                              )
                              .join(", ")}
                          </Text>
                          <Text>County: {field.county || "—"}</Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      ))}
    </Page>
  </Document>
);

export default FsaPlantingDateDocument;
