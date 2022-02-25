// LIB
// plugin 사용을 위해 puppeteer-extra 사용
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import mongoose from 'mongoose';
import mysql from 'mysql2/promise';
import _ from 'lodash';

// MODEL
import CrawlerProduct from "./models/crawler_product.js";

// CONFIG
import { mysqlconfig, mongoConfig } from "./config/dbconfig.js";

// stealth plugin 추가
puppeteer.use(StealthPlugin());
// DB 연결
mongoose.connect(mongoConfig.url, mongoConfig.opt);

const conn = await mysql.createConnection(mysqlconfig)

await conn.execute(
    `CREATE TABLE IF NOT EXISTS SHOP_ITEMS(
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(300),
            shop_name VARCHAR(60),
            price INT,
            deli_price INT,
            total_price INT
          )`
);

let data = [];

puppeteer.launch({ headless: false }).then(async broswer => {
    const page = await broswer.newPage();
    await page.goto("https://shopping.naver.com/home/p/index.naver", { waitUntil: "networkidle2" });

    await page.waitForSelector('[name="query"]', { visible: true }).catch(console.error);

    const products = await CrawlerProduct.find({
        status: { $nin: ["removed", "no_product"]},
        crawler_page: 51
    }, {
        ref: true,
        product_name: true
    }).lean();

    for(let product of products) {

        const { product_name, ref } = product;

        const first_name = _.head(product_name.split(' '))
        const first_ref = _.head(ref.split('_'));

        for (let word of [product_name, first_ref]) {
            // 검색어가 존재한다면 지워주기
            await page.$eval('[name="query"]', el => el.value = '').catch(console.error);
            await page.$eval('[class^=searchInput_search_input]', el => el.value = '').catch(console.error);

            try {
                await page.type('[name="query"]', String(word))
            } catch (e) {
                await page.type('[class^=searchInput_search_input]', String(word));
            }
            await page.keyboard.press("Enter");
            await page.waitForNavigation({waitUntil: "networkidle2"}).catch(console.error);

            const items = await page.$$('[class^=basicList_item]');
            if (items?.length > 0) {
                for (let item of items) {
                    const title = await item.$eval('a[class^=basicList_link][title]', el => el.title);
                    const price = await item.$eval('span[class^=price_num]', el => el.innerText)
                        .then(el => parseInt(el.replace(/[,원]/g, '').trim())).catch(_ => 0);
                    const opts = await item.$$eval('[class^=basicList_option]', els => els.map(el => el.innerText))
                    const shop_name = await item.$eval(' a[class^=basicList_mall]', el => el.innerText.trim());
                    // 배송비 옵션
                    const deli_opt = String(_.find(opts, function (o) {
                        return /배송비/.test(o)
                    })).replace(/[가-힣,]/g, '').trim()
                    const deli_price = parseInt(deli_opt ? deli_opt : 0);
                    const total_price = price + deli_price;

                    data.push({title, price, deli_price, total_price, shop_name})
                }
            }
        }

        data = _.filter(data, function(o){ return o.shop_name !== '쇼핑몰별 최저가'})
        data = _.uniqBy(data, 'shop_name');
        console.log(data)
        for (let d of data) {
            const {title, price, deli_price, total_price, shop_name} = d;
            await conn.execute(`INSERT INTO 
                           SHOP_ITEMS(title, price, deli_price, total_price, shop_name) 
                           VALUES('${title}', ${price}, ${deli_price}, ${total_price}, '${shop_name}')`)
        }
    }
})


