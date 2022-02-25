import mongoose from 'mongoose';

const crawlerProductsSchema = mongoose.Schema({
    website: {type: Number, ref: 'websites'},
    crawler_page: {type: Number, ref: 'crawler_pages'},
    status: {type: String, index: true, default: 'ready'},  //ready(준비중), enabled(판매중), disabled(판매정지)
    status_cafe24: {type: String, index: true, default: 'init'},  //init(전송전), sent(전송완료), error(에러발생)
    status_linker: {type: String, index: true, default: 'init'},  //링커 연동(재고의 경우만 연동 과정이 있음), 나중에 작업
    status_locked: {type: Boolean, index: true},
    status_crawling_locked: {type: Boolean, index: true},
    material: [{type: String, index: true}],
    error_msg: String,
    product_name: String,
    add_product_name: String,
    url: String,
    product_no: {type: Number, index: true},  //cafe24의 product_no
    product_no_2: Number, //마이그레이션을 위한 임시 product_no
    product_no_3: {type: Number, index: true}, // 당일배송상품 product_no
    product_no_playauto: {type: String, index: true},  //playauto의 product_no
    additional_categories: [{type: Number, ref: 'categories'}],
    replace_categories: [{type: Number, ref: 'categories'}],
    check_categories: Boolean,
    retail_price: Number,
    price: Number,                   // 판매가
    sale_percentage:Number,          // 할인률
    revenue_price: Number,           // 수익가
    revenue_price_won: Number,       // 수익가(원)
    retail_price_won: Number,        // 정가(원)
    price_won: Number,               // 판매가(원)
    is_up_retail_price: Boolean,
    up_retail_price_won: Number,     // 할증가격(원)
    FTA: { type: Boolean, default: false },
    description: String,
    composition: String,
    description_kr: String,
    composition_kr: String,
    ref: String,
    color_code: String,
    input_origin: String,
    html: String,
    main_image_url: String,
    check_duplication: {type: String, index: true, default: 'init'},
    images: [{
        prefix: String,
        image_original_url: String,
        image_original: String,
        image_cropped: String,
        image_square: String,
        title: String,
        is_main_image: Boolean
    }],
    settings: {
        image_fix: String,
        retail_price_fix: String,
        view_original_url: String,
        re_regist_cafe24: String
    },
    // playauto 추가
    playauto: {
        stat: { type: String, default: 'disabled', trim: true },
        smartstore: {
            stat: { type: String, trim: true, default: '판매대기' },
            send: { type: String, trim: true },
            sent: Boolean,
            createAt: Date
        },
        gmarket: {
            stat: { type: String, trim: true, default: '판매대기' },
            send: { type: String, trim: true, default: 'disabled' },
            sent: Boolean,
            createAt: Date
        },
        auction: {
            stat: { type: String, trim: true, default: '판매대기' },
            send: { type: String, trim: true, default: 'disabled' },
            sent: Boolean,
            createAt: Date
        },
        gsshop: {
            stat: { type: String, trim: true, default: '판매대기' },
            send: { type: String, trim: true, default: 'disabled' },
            sent: Boolean,
            createAt: Date
        },
        st11: {
            stat: { type: String, trim: true, default: '판매대기' },
            send: { type: String, trim: true, default: 'disabled' },
            sent: Boolean,
            createAt: Date
        },
        brandi: {
            stat: { type: String, trim: true, default: '판매대기' },
            send: { type: String, trim: true, default: 'disabled' },
            sent: Boolean,
            createAt: Date
        }
    },
    // TODO 추가금액 추가
    options: [
        {
            name: String,
            items: [
                {
                    name: String,
                    status: String,
                    quantity: Number,
                    use_stock: Boolean,
                    custom_variant_code: String,
                    barcode: String,
                    // playauto 옵션 추가
                    is_playauto_uploaded: Boolean,
                    add_amount: Number
                }  //status : in_stock(재고 있음), out_of_stock(재고 없음)
            ],
            status: String
        }
    ],
    option_idx: Number,
    last_crawled_at: Date,
    cafe24_updated_at: Date,
    linker_updated_at: Date,
    updated_at: Date,
    created_at: Date
});

const crawler_products = mongoose.model('crawler_products', crawlerProductsSchema);

export default crawler_products;