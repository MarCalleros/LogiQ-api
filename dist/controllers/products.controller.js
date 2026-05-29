import { productsService } from "../services/products.service.js";
function getIdParam(req) {
    const raw = req.params.id;
    return Array.isArray(raw) ? raw[0] : raw;
}
export async function listProducts(req, res) {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const products = await productsService.list(search, req.auth?.businessId);
    res.json({ count: products.length, products });
}
export async function getProduct(req, res) {
    const product = await productsService.getById(getIdParam(req), req.auth?.businessId);
    res.json({ product });
}
export async function createProduct(req, res) {
    const product = await productsService.create(req.body, req.auth?.businessId);
    res.status(201).json({ product });
}
export async function updateProduct(req, res) {
    const product = await productsService.update(getIdParam(req), req.body, req.auth?.businessId);
    res.json({ product });
}
export async function deleteProduct(req, res) {
    await productsService.remove(getIdParam(req), req.auth?.businessId);
    res.status(204).send();
}
