-- Die App speichert keine Texte und Ergebnisse mehr (ADR 0008). Die bisher
-- gespeicherten Analysen werden gelöscht; die Tabelle selbst entfällt mit der
-- Datenbank in einem späteren Schritt.
DELETE FROM "Result";
