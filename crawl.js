// LIB
// plugin 사용을 위해 puppeteer-extra 사용
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import mongoose from 'mongoose';
import _ from 'lodash';

// MODEL
import CrawlerProduct from "./models/crawler_product.js";

// stealth plugin 추가
puppeteer.use(StealthPlugin());
// DB 연결
mongoose.connect('mongodb://nowinparis:W2jXbD9AGynu@localhost:27017/nowinparis',{
    useNewUrlParser: true,
    useUnifiedTopology : true
});



puppeteer.launch({ headless: false }).then(async broswer => {
    const page = await broswer.newPage();
    await page.goto("https://shopping.naver.com/home/p/index.naver", { waitUntil: "networkidle2" });

    await page.waitForSelector('[name="query"]', { visible: true }).catch(console.error);

    const { product_name, ref } = await CrawlerProduct.findOne({
        status: { $nin: ["removed", "no_product"]},
        ref: /MFPPA00202/
    }, {
        ref: true,
        product_name: true
    }).lean();

    const first_name = _.head(product_name.split(' '))
    const other_name = _.pull(product_name.split(' '), first_name).join(' ');
    const first_ref = _.head(ref.split('_'));

    console.log(first_name);
    console.log(other_name);

    await page.type('[name="query"]', String(first_ref))
    await page.keyboard.press("Enter");
})


