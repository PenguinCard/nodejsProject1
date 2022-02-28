import mongoose from 'mongoose';

const crawlerProductsSchema = mongoose.Schema({
    website: {type: Number, ref: 'websites'},
    crawler_page: {type: Number, ref: 'crawler_pages'},
    status: {type: String, index: true, default: 'ready'},  //ready(준비중), enabled(판매중), disabled(판매정지)
    product_name: String,
    url: String,
    price: Number,                   // 판매가
    sale_percentage:Number,          // 할인률
    ref: String,
    color_code: String,
});

const crawler_products = mongoose.model('crawler_products', crawlerProductsSchema);

export default crawler_products;