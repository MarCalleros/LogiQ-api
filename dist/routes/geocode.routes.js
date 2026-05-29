import { Router } from "express";
import { Client } from "@googlemaps/google-maps-services-js";
const router = Router();
const client = new Client();
router.get("/", async (req, res) => {
    console.log('Recibida solicitud de geocodificación para:', req.query);
    const { address } = req.query;
    if (!address) {
        res.status(400).json({ error: "Falta el parámetro address" });
        return;
    }
    try {
        const response = await client.geocode({
            params: {
                address,
                key: process.env.GOOGLE_MAPS_API_KEY,
                language: "es",
                region: "mx",
            },
        });
        console.log('Google status:', response.data.status);
        console.log('Resultados:', response.data.results.length);
        console.log('Error message:', response.data.error_message);
        if (!response.data.results.length) {
            res.status(404).json({ error: "Dirección no encontrada" });
            return;
        }
        const result = response.data.results[0];
        res.json({
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            formatted_address: result.formatted_address,
        });
    }
    catch (error) {
        console.error('Error geocodificando:', error); // ← ver el error real
        res.status(500).json({ error: "Error al geocodificar la dirección" });
    }
});
router.get("/reverse", async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
        res.status(400).json({ error: "Faltan coordenadas" });
        return;
    }
    try {
        const response = await client.reverseGeocode({
            params: {
                latlng: { lat: parseFloat(lat), lng: parseFloat(lng) },
                key: process.env.GOOGLE_MAPS_API_KEY,
                language: "es",
            },
        });
        if (!response.data.results.length) {
            res.status(404).json({ error: "No se encontró dirección" });
            return;
        }
        res.json({
            formatted_address: response.data.results[0].formatted_address,
        });
    }
    catch {
        res.status(500).json({ error: "Error en geocodificación inversa" });
    }
});
export const geocodeRouter = router;
