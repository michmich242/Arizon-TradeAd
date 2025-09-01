import config from "./config.json" with {type : "json"};
import {Client, Events, GatewayIntentBits, WebhookClient} from "discord.js";
import "dotenv/config";
import fs from "fs";
import sharp from "sharp";




let prev_id = "";



function retrieveANDsaveID(new_id){
    prev_id = new_id;
    fs.writeFileSync("storage/Recent_T_ID.txt", String(new_id), "utf8");


    return prev_id;
}


const client = new Client({intents : [
    GatewayIntentBits.Guilds
]});


const hook = new WebhookClient({
    url : process.env.DISCORD_WEBHOOK
});


async function run_send_inbound(){

    while(true){
        await send_inbound();
        await sleep(180000);
    }
}



async function grab_assets(asset_IDS){

    const asset_images = await fetch("https://thumbnails.roblox.com/v1/assets?assetIds=" + asset_IDS + "&size=150x150&isCircular=false&format=Png", {
        method : "GET",
        headers : {
            "Accept" : "application/json"
        }
        });

    const response = await asset_images.json();

    return response;

}



async function send_inbound(){


    

    const inbounds = await fetch("https://trades.roblox.com/v1/trades/inbound?limit=10", {
        method : "GET",

        headers : {
            "Cookie" : ".ROBLOSECURITY=" + config.RobloxSecurity
        }
        });
        const hold = await inbounds.json();




        if(prev_id != hold.data[0].id){
            return;
        }

        const inbound_detail = await fetch("https://trades.roblox.com/v2/trades/" + hold.data[0].id, {
            method : "GET",

            headers : {
                "Cookie" : ".ROBLOSECURITY=" + config.RobloxSecurity
            }
        });

        const hold_details = await inbound_detail.json();


        const assetsA = [];
        const assetsB = [];

        for(let i = 0; i < (hold_details.participantAOffer.items).length; ++i){
            assetsA.push(Number(hold_details.participantAOffer.items[i].itemTarget.targetId));
        }

        for(let i = 0; i < (hold_details.participantBOffer.items).length; ++i){
            assetsB.push(Number(hold_details.participantBOffer.items[i].itemTarget.targetId));
        }

        const user = await grab_assets(assetsA)
        const requester = await grab_assets(assetsB);

        console.log(requester);

        const assetsA_imgs = [];
        const assetB_imgs = [];

        for(let i = 0; i < (user.data).length; ++i){
            assetsA_imgs.push(user.data[i].imageUrl);
        }

        for(let i = 0; i < (requester.data).length; ++i){
            assetB_imgs.push(requester.data[i].imageUrl);
        }

        console.log(assetB_imgs);
        



        const hold_userIDS = [hold_details.participantAOffer.user.id, hold_details.participantBOffer.user.id];
        const image_users = await fetch("https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" + hold_userIDS + "&size=150x150&format=Png&isCircular=true", {
            method : "GET",
            headers : {
                "Accept" : "application/json"
            }
        });

        const hold_images = await image_users.json();


        const result = await buildTradeImg("bin/Complete_Frame.png", ["bin/Blank_Frame.png", "bin/Trade_Frame.png"], assetsA_imgs, assetB_imgs);



        await hook.send({
        username: hold_details.participantAOffer.user.displayName,
        avatarURL: hold_images.data[0].imageUrl,

        files : [
            {
            attachment : result,
            name : "trade.png"
            }
        ],
        embeds: [
            {
            title: "NEW TRADE INBOUND FROM: " + hold_details.participantBOffer.user.displayName,
            url: "https://www.roblox.com/trades?tab=Inbound",
            color: 0x00B894,
            timestamp: new Date().toISOString(),
            author: {
                name: "Arizon Trade Inbound Notifier",
            },
            image:     { url: "attachment://trade.png" },
            fields: [
                { name: "Commit", value: "`abc123`", inline: true },
                { name: "Duration", value: "2m 14s", inline: true },
                { name: "Env", value: "prod", inline: true }
            ],
            footer: {
                text: "Powered by Arizon • v1.0",
                icon_url: "https://example.com/footer-icon.png"
            }
            },
        ]
        });

        retrieveANDsaveID(hold.data[0].id);


}


async function buildTradeImg(main_frame, overlay_frames, A_itemID_urls, B_itemID_urls){
    const resize_Main = await sharp(main_frame).resize({width : 1300, height : 620}).toBuffer();


    const composites = [];

    const resizeOverlay0 = await sharp(overlay_frames[0]).resize(170, 170).toBuffer();
    const resizedOverlay1 = await sharp(overlay_frames[1]).resize(725, 200).toBuffer();
    


    composites.push({input : resizeOverlay0, left : 1100, top : 100 });
    composites.push({input : resizeOverlay0, left : 1100, top : 425 });
    composites.push({input : resizedOverlay1, left : 50, top : 100});
    composites.push({input : resizedOverlay1, left : 50, top : 400});

    
    for(let i = 0; i < A_itemID_urls.length; ++i){
        const response = await fetch(A_itemID_urls[i], {
            method : "GET"
        });

        const resp = await response.arrayBuffer();
        const buf = Buffer.from(resp);

        if(i == 0){
            composites.push({input : buf, left : 76, top : 125});
        }
        else if(i == 1){
            composites.push({input : buf, left : 252, top : 125});
        }
        else if(i == 2){
            composites.push({input : buf, left : 432, top : 125});
        }
        else if(i == 3){
            composites.push({input : buf, left : 607, top : 125});

        }
    }



    for(let i = 0; i < B_itemID_urls.length; ++i){
        
        const response = await fetch(B_itemID_urls[i], {
            method : "GET"
        });

        const resp = await response.arrayBuffer();
        const buf = Buffer.from(resp);

        if(i == 0){
            composites.push({input : buf, left : 76, top : 425});
        }
        else if(i == 1){
            composites.push({input : buf, left : 252, top : 425});
        }
        else if(i == 2){
            composites.push({input : buf, left : 432, top : 425});
        }
        else if(i == 3){
            composites.push({input : buf, left : 607, top : 425});

        }


    }

    


    

    return sharp(resize_Main).composite(composites).png().toBuffer();
}





async function check_roli_exists(){
    const result = await fetch("https://rolimons.com");

    if(result.status == 200){
        console.log("Rolimons is up!");
        return true;
    }
    else{
        console.log("Rolimons is down.");
        return false;
    }

}


function sleep(ms){
    let Wait = new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });

    return Wait;
}



async function check_offering_items(){
    const check_inventory = await fetch("https://inventory.roblox.com/v1/users/" + config.roblox_id + "/assets/collectibles?limit=100", {
        method : "GET",
        headers : {
            "Accept" : "application/json"
        }
    })

    const response = await check_inventory.json();

    for(let i = 0; i < (config.items_send).length; ++i){
        const id = config.items_send[i];

        let checker = 0;
        for(let j = 0; j < (response.data).length; ++j){
            if(Number(id) === Number(response.data[j].assetId)){
                checker = 1;
                break;
            }
        }


        if(checker == 0){
            console.log("Removing " + id + " (not in inventory).");
            config.items_send.splice(i, 1);
            --i;
        }

        console.log(config.items_send);

    }

    
    fs.writeFileSync("config.json", JSON.stringify(config, null, 5), "utf8");

}



async function send_ad(){


    await check_offering_items();

    let body_send = {"player_id" : config.roblox_id, "offer_item_ids" : config.items_send, "request_item_ids" : config.items_request, "request_tags" : config.tags_send};



    const result = await fetch("https://api.rolimons.com/tradeads/v1/createad", {
        method: 'POST',
        headers: {
            "Content-Type" : "application/json",
            "Cookie" : "_RoliVerification=" + config.RoliVerification
        },
        body: JSON.stringify(body_send)
    });

    if(result.ok){
        console.log("Successfully sent a trade ad!");
    }
    else{
        console.log("Failed to send trade ad (Exceeded time limit?).");
    }

    console.log(result.status);

    const data = await result.json();
    console.log(data);

}


async function run_send_ad(){
    while(true){
        await send_ad();
        await sleep(1080000);

    }
}


async function main(){


    if(!fs.existsSync("storage")){
        fs.mkdirSync("storage", {recursive : true});
    }

    if(!fs.existsSync("storage/Recent_T_ID.txt")){
        fs.writeFileSync("storage/Recent_T_ID.txt", "", "utf8");
    }
    else{
        prev_id = Number(fs.readFileSync("storage/Recent_T_ID.txt", "utf8").trim());
    }

/*
    if(!(await check_roli_exists())){
        return;
    }
*/
    //run_send_ad();

    run_send_inbound();


}



main();
