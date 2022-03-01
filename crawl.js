// LIB
// plugin 사용을 위해 puppeteer-extra 사용
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import cheerio from 'cheerio';
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

puppeteer.launch({ headless: false }).then(async broswer => {

    let data = [], products = [], html, $;

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

    products = await CrawlerProduct.aggregate([{
        $match: {
            status: { $nin: ["removed", "no_product"]},
            // ref: /MFPCA00213/,
            // ref: /CFPRO00886/,
            website: { $in: [1, 3]}
        }
    }, {
        $lookup: {
            from: "websites",
            localField: "website",
            foreignField: "_id",
            as: "website_info"
        }
    }, {
        $limit: 10
    }, {
        $project: {
            ref: true,
            product_name: true,
            website: true,
            "website_info.title": true,
            "website_info.description": true
        }
    }])


    if(products?.length > 0) {

        const page = await broswer.newPage();
        await page.goto("https://shopping.naver.com/home/p/index.naver", { waitUntil: "networkidle2" });

        for (let product of products) {
            // 검색 접두사, 접미어
            const prefixes = [], suffixes = [], links = [];

            let { product_name, ref, website_info } = product;
            if (website_info.length > 0) {
                let website_kr = website_info[0]?.description.trim();
                let website_en = website_info[0]?.title.trim();
                if(website_kr) prefixes.push(website_kr);
                if(website_en) prefixes.push(website_en);
            }

            for(let keyword of [{name: product_name, "step": ' '}, {name: ref, "step": '_'}]) {
                const val = _.head(keyword.name.split(keyword.step)).trim();
                if(val) suffixes.push(val);
            }

            console.log(prefixes, suffixes)

            // 접두사 또는 접미어가 없으면 다음 task로 넘김
            if(prefixes.length === 0 || suffixes.length === 0) continue;

            const regex = new RegExp(`(${prefixes.join('|')}).*(${suffixes.join('|')})`)

            for (let prefix of prefixes){
                for (let suffix of suffixes) {
                    const keyword = prefix.concat(' ', '+', suffix);
                    const search_area1 = await page.$('input[name=query]');

                    const search_selector = search_area1 ? 'input[name=query]' : '[class^=searchInput_search_input]';

                    await page.$eval(search_selector, el => el.value='');
                    await page.type(search_selector, keyword);
                    await page.keyboard.press('Enter');
                    await page.waitForNavigation({}).catch(console.error);
                    let beforeHeight = 0
                    let afterHeight = await page.evaluate("document.body.clientHeight");

                    while(beforeHeight!==afterHeight) {
                        console.log('scroll', beforeHeight, afterHeight);
                        await page.evaluate(`scroll(${beforeHeight}, ${afterHeight})`);
                        beforeHeight = afterHeight;
                        afterHeight = await page.evaluate("document.body.clientHeight");
                    }

                    html = await page.content();
                    $ = cheerio.load(html);

                    $("li[class^=basicList_item]").each((i, el) => {
                        const options = [];
                        const shop1 = $(el).find('[class^=basicList_mall_title] a[class^=basicList_mall] img').attr('alt');
                        const shop2 = $(el).find('[class^=basicList_mall_title] a[class^=basicList_mall]').text().trim()
                        const shop = shop1 ? shop1 : shop2;

                        if(shop !== '쇼핑몰별 최저가') {

                            const title = $(el).find('[class^=basicList_title] a').text().trim();

                            $(el).find('[class^=basicList_option] li').each((i, el) => options.push($(el).text().trim()))
                            const option = _.find(options, function (o) { return /배송비/.test(o) })

                            const deli_price = option?.replace(/\D/g, '').trim() ? parseInt(option.replace(/\D/g, '').trim()) : 0;
                            const price = parseInt($(el).find('span[class^=price_num]').text().replace(/[,원]/g, '').trim())
                            const total_price = price + deli_price;

                            data.push({ shop, price, title, deli_price, total_price })

                            console.log(i, shop, title, price, deli_price);
                        } else {
                            const link = $(el).find('[class^=basicList_mall_title] a[class^=basicList_mall]').attr('href');
                            links.push(link);
                        }
                    })

                    await page.waitForTimeout(5000);
                }
            }
            if(links.length > 0) {
                for (let link of links) {
                    await page.goto(link, {waitUntil: "networkidle2"});

                    html = await page.content();
                    $ = cheerio.load(html);

                    const title = $('[class^=top_summary_title] h2').text().replace('해외', '').trim();

                    $('[class^=productByMall_list] tbody tr').each((i, el) => {
                        const shop1 = $(el).find('[class^=productByMall_mall_area] a img').attr('alt');
                        const shop2 = $(el).find('[class^=productByMall_mall_area] a').text().trim()
                        const shop = shop1 ? shop1 : shop2;

                        const total_price = parseInt($(el).find('[class^=productByMall_price] em').text().replace(/\D|\s/g, ''))
                        const deli_price = parseInt($(el).find('[class^=productByMall_gift]').text().replace(/\D|\s/g, ''))
                        const price = total_price - deli_price

                        console.log(i, shop, title, price, deli_price, total_price);

                        data.push({shop, price, title, deli_price, total_price})
                    })

                    await page.waitForTimeout(5000);
                }
            }

            console.log('data1', data);

            data = _.uniqBy(data, 'shop');

            console.log('data2', data);
            data = _.filter(data, function(o) { return regex.test(o.title) })

            console.log(data);

            for (let d of data) {
                const {title, price, deli_price, total_price, shop} = d;
                await conn.execute(
                    `INSERT INTO
                     SHOP_ITEMS(title, price, deli_price, total_price, shop_name)
                     VALUES('${title}', ${price}, ${deli_price}, ${total_price}, '${shop}')`
                )
            }
        }
    }
})


