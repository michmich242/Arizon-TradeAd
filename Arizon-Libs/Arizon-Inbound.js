import config from "../config.json" with {type : 'json'};
import sharp from "sharp";
import {Client, Events, GatewayIntentBits, WebhookClient} from "discord.js";
import fs from "fs";
import {sleep} from "../Arizon-Ad.js";

const client = new Client({intents : [
    GatewayIntentBits.Guilds
]});


const hook = new WebhookClient({
    url : process.env.DISCORD_WEBHOOK
});



let trade_index = 0;

export let prev_date = {value : null};

let rolimon_values = {};




async function grab_assets(asset_IDS){

    let asset_images = null;
    try{
        asset_images = await fetch("https://thumbnails.roblox.com/v1/assets?assetIds=" + asset_IDS + "&size=150x150&isCircular=false&format=Png", {
            method : "GET",
            headers : {
                "Accept" : "application/json"
            }
            });
    }catch(err){
        console.log("There has been an issue requesting from the asset images: " + err + ". Retrying in 20 seconds.");
        return -1;
    }


    const response = await asset_images.json();



    return response;

}



export async function retrieve_IDValues(){
    const grab_values = await fetch("https://api.rolimons.com/items/v2/itemdetails", {
        method : "GET",
        headers : {
            "Accept" : "application/json"
        }
    });

    rolimon_values = await grab_values.json();

}



export function retrieveANDsaveID(new_id){
    prev_date.value = new_id;
    fs.writeFileSync("storage/Recent_T_ID.txt", String(new_id), "utf8");


    return prev_date.value;
}





export async function send_inbound(){


    let inb_count = 0;
    let inbounds = null;
    try{
        inbounds = await fetch("https://trades.roblox.com/v1/trades/inbound?limit=10", {
            method : "GET",

            headers : {
                "Cookie" : ".ROBLOSECURITY=" + config.RobloxSecurity
            }
            });
    }catch(err){
        console.log("There has been an issue requesting from trade inbounds, trying again in 20 seconds." + err);
        return;

    }
    const hold = await inbounds.json();



        if(!(inbounds.ok)){
            return;
        }

        if((hold.data).length === 0){
            return;
        }

        if((hold.data).length > 4){
            inb_count = 4;
        }
        else{
            inb_count = (hold.data).length - 1;
        }

        

        trade_index = inb_count;

        while(trade_index >= 0){


            if(!("created" in hold.data[trade_index])){
                return -1;
            }

            const trade_date = new Date(hold.data[trade_index].created);

            const temp_prev = new Date(prev_date.value);

            
            if(temp_prev >= trade_date){
                --trade_index;
                continue;
            }
                
            
            
            await send_inbound_setup(hold, trade_index);
            await sleep(1000);
            --trade_index;

        }
}





export async function send_inbound_setup(hold, trade_index){



    let inbound_detail = null;
    try{
        inbound_detail = await fetch("https://trades.roblox.com/v2/trades/" + hold.data[trade_index].id, {
            method : "GET",

            headers : {
                "Cookie" : ".ROBLOSECURITY=" + config.RobloxSecurity
            }
        });
    }catch(err){
        console.log("Errof grabbing trade details: " + err + ". Retrying in 5 seconds.");
        ++trade_index;
        await sleep(4000);
        return;
    }

    const hold_details = await inbound_detail.json();

    console.log(hold_details.participantAOffer.items);


    const assetsA = [];
    const assetsB = [];


    let asset_image_corr_A = [];
    let asset_image_corr_B = [];

    let handle_duplicates_A = [];
    let handle_duplicates_B = [];





    for(let i = 0; i < (hold_details.participantAOffer.items).length; ++i){
        
        let assetID = hold_details.participantAOffer.items[i].itemTarget.targetId;
        if(handle_duplicates_A[assetID] === 1){
            ++handle_duplicates_A[assetID];
        }
        else{
            handle_duplicates_A[assetID] = 1;
        }

        assetsA.push(Number(assetID));
        
    }

    for(let i = 0; i < (hold_details.participantBOffer.items).length; ++i){
        let assetID = hold_details.participantBOffer.items[i].itemTarget.targetId;
        if(handle_duplicates_B[assetID] === 1){
            ++handle_duplicates_B[assetID];
        }
        else{
            handle_duplicates_B[assetID] = 1;
        }

        assetsB.push(Number(assetID));
    }

    const user = await grab_assets(assetsA)
    const requester = await grab_assets(assetsB);

    if(user === -1 || requester === -1){
        ++trade_index;
        return;
    }

    


    for(let i = 0; i < assetsA.length; ++i){
        for(let j = 0; j < (user.data).length; ++j){
            if(assetsA[i] == user.data[j].targetId){
                asset_image_corr_A.push(user.data[j].imageUrl);
                break;
            }
        }
    }

    
    for(let i = 0; i < assetsB.length; ++i){
        for(let j = 0; j < (requester.data).length; ++j){
            if(assetsB[i] == requester.data[j].targetId){
                asset_image_corr_B.push(requester.data[j].imageUrl);
                break;
            }
        }
    }



    



    const hold_userIDS = [hold_details.participantAOffer.user.id, hold_details.participantBOffer.user.id];

    let image_users = null;
    try{
        image_users = await fetch("https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" + hold_userIDS + "&size=150x150&format=Png&isCircular=true", {
            method : "GET",
            headers : {
                "Accept" : "application/json"
            }
        });
    }catch(err){
        console.log("There has been an issue grabbing the users avatar img: " + err + ". Retrying in 20 seconds");
        ++trade_index;
        return;
    }

    const hold_images = await image_users.json();
    console.log(hold_images);

    const user_img_order = [];

    if(hold_images.data[0].targetId === config.roblox_id){
        user_img_order.push(hold_images.data[0].imageUrl);
        user_img_order.push(hold_images.data[1].imageUrl);
    }
    else if(hold_images.data[0].targetId !== config.roblox_id){
        user_img_order.push(hold_images.data[1].imageUrl);
        user_img_order.push(hold_images.data[0].imageUrl);
    }
    else{
        console.log("There has been an issue grabbing thumbnails of users.");
        return;
    }


    let A_rolival = [];
    let B_rolival = [];


    for(let i = 0; i < assetsA.length; ++i){

        try{

            
            let id = rolimon_values.items[assetsA[i]];
            if(!id || id.length < 4){
                throw "err";
            }
            A_rolival.push([id[2], id[4]]); 
        }

        catch(err){
            console.log("Item not found within rolimons, using roblox RAP in replacement.");
            for(let j = 0; j < (hold_details.participantAOffer.items).length; ++j){
                if(hold_details.participantAOffer.items[j].itemTarget.targetId == assetsA[i]){
                    A_rolival.push([hold_details.participantAOffer.items[j].recentAveragePrice, hold_details.participantAOffer.items[j].recentAveragePrice]);
                }
            }
        }
    }

    for(let i = 0; i < assetsB.length; ++i){
        try{


            let id = rolimon_values.items[assetsB[i]];

            if(!id || id.length < 4){
                throw "err";
            }

            B_rolival.push([id[2], id[4]]);
        }
        catch(err){
            console.log("Item not found within rolimons, using roblox RAP in replacement.");
            for(let j = 0; j < (hold_details.participantBOffer.items).length; ++j){
                if(hold_details.participantBOffer.items[j].itemTarget.targetId == assetsB[i]){
                    B_rolival.push([hold_details.participantBOffer.items[j].recentAveragePrice, hold_details.participantBOffer.items[j].recentAveragePrice]);
                }
            }
        }

    }


    


    const [result, sums] = await buildTradeImg(
        "bin/Complete_Frame.png",
        ["bin/Blank_Frame.png", "bin/Trade_Frame.png"],
        asset_image_corr_A, 
        asset_image_corr_B, 
        A_rolival, 
        B_rolival,
        user_img_order);


    if(result === -1){
        ++trade_index;
    }



    let payload = "";

    
    payload += Math.abs(sums[0].rap - sums[1].rap);

    if(sums[0].rap - sums[1].rap == 0){
        payload += " RAP EQUAL 🟰";
    }
    else if(sums[0].rap - sums[1].rap > 0){
        payload += " RAP LOSS ❌📉";
    }
    else{
        payload += " RAP WIN ✅📈"
    }

    payload += "\n";
    payload += Math.abs(sums[0].value - sums[1].value);

    if(sums[0].value - sums[1].value == 0){
        payload += " VALUE EQUAL 🟰";
    }
    else if(sums[0].value - sums[1].value > 0){
        payload += " VALUE LOSS ❌📉";
    }
    else{
        payload += " VALUE WIN ✅📈"
    }



    await hook.send({
    username: hold_details.participantAOffer.user.displayName,
    avatarURL: user_img_order[0],

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
            { name: "Trade: ", value: payload, inline: false }
        ],
        footer: {
            text: "Powered by Arizon • v1.0",
        }
        },
    ]
    });

    console.log("New Trade Inbound!");

    retrieveANDsaveID(hold.data[trade_index].created);


}




export async function buildTradeImg(main_frame, overlay_frames, A_itemID_urls, B_itemID_urls, assetA_values, assetB_values, user_imgs){
    const resize_Main = await sharp(main_frame).resize({width : 1300, height : 620}).toBuffer();


    const composites = [];

    const sumA = {rap : 0, value : 0};
    const sumB = {rap : 0, value : 0};

    for(let i = 0; i < assetA_values.length; ++i){
        sumA.rap += assetA_values[i][0]; 
        sumA.value += assetA_values[i][1];
    }

    for(let i = 0; i < assetB_values.length; ++i){
        sumB.rap += assetB_values[i][0]; 
        sumB.value += assetB_values[i][1];
    }

    console.log(sumA);
    console.log(sumB);


    const resizeOverlay0 = await sharp(overlay_frames[0]).resize(170, 170).toBuffer();
    const resizedOverlay1 = await sharp(overlay_frames[1]).resize(725, 200).toBuffer();
    


    composites.push({input : resizeOverlay0, left : 1100, top : 100 });
    composites.push({input : resizeOverlay0, left : 1100, top : 425 });
    composites.push({input : resizedOverlay1, left : 50, top : 100});
    composites.push({input : resizedOverlay1, left : 50, top : 400});
    

    
    for(let i = 0; i < A_itemID_urls.length; ++i){

        let response = null;
        try{
            response = await fetch(A_itemID_urls[i], {
                method : "GET"
        });
        }catch(err){
            console.log("There has been an issue grabbing one of the item images: " + err + ". Retrying in 5 seconds.");
            await sleep(5000);
            --i;
            continue;
        }

        if(!(response.ok)){
            --i;
            await sleep(1000);
            console.log("Issue fetching image of an item.");

            continue;
        }
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
        
        let response = null;
        try{
            response = await fetch(B_itemID_urls[i], {
                method : "GET"
            });
        }catch(err){
             console.log("There has been an issue grabbing one of the item images: " + err + ". Retrying in 5 seconds.");
            await sleep(5000);
            --i;
            continue;        
        }

        if(!(response.ok)){
            --i;
            await sleep(1000);
            console.log("Issue fetching image of an item.");
            continue;
        }

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

        
    for(let i = 0; i < assetA_values.length; ++i){
        
        const textBuffer = await sharp({
            text: {
                text : `<span foreground=\"#0cda2eff\">RAP: ${assetA_values[i][0]}</span>\n<span foreground=\"#4b63ebff\">VALUE: ${assetA_values[i][1]}</span>
                        `,
                font: "Arial", 
                width: 245,
                height: 55,
                align: "left",
                rgba: true
            }
        }).png().toBuffer();

        if(i == 0){
            composites.push({input : textBuffer, left : 48, top : 50});
        }
        else if(i == 1){
            composites.push({input : textBuffer, left : 238, top : 50});
        }
        else if(i == 2){
            composites.push({input : textBuffer, left : 420, top : 50});
        }
        else if(i == 3){
            composites.push({input : textBuffer, left : 596, top : 50});
        }
    }




    for(let i = 0; i < assetB_values.length; ++i){
           
        const textBuffer = await sharp({
            text: {
                text : `<span foreground=\"#0cda2eff\">RAP: ${assetB_values[i][0]}</span>\n<span foreground=\"#4b63ebff\">VALUE: ${assetB_values[i][1]}</span>
                        `,
                font: "Arial", 
                width: 245,
                height: 55,
                align: "left",
                rgba: true
            }
        }).png().toBuffer();

        if(i == 0){
            composites.push({input : textBuffer, left : 48, top : 350});
        }
        else if(i == 1){
            composites.push({input : textBuffer, left : 238, top : 350});
        }
        else if(i == 2){
            composites.push({input : textBuffer, left : 420, top : 350});
        }
        else if(i == 3){
            composites.push({input : textBuffer, left : 596, top : 350});
        }
    
    }



    const textSumA = await sharp({
        text: {
            text : `<span foreground=\"#09f731ff\">TOTAL RAP:          ${sumA.rap}</span>\n<span foreground=\"#2289ffff\">TOTAL VALUE:      ${sumA.value}</span>
                    `,
            font: "Arial", 
            width: 235,
            height: 65,
            align: "left",
            rgba: true
        }
    }).png().toBuffer();


    const textSumB = await sharp({
        text: {
            text : `<span foreground=\"#09f731ff\">TOTAL RAP:          ${sumB.rap}</span>\n<span foreground=\"#2289ffff\">TOTAL VALUE:      ${sumB.value}</span>
                    `,
            font: "Arial", 
            width: 235,
            height: 65,
            align: "left",
            rgba: true
        }
    }).png().toBuffer();

    composites.push({input : textSumA, left : 800, top : 165});



    composites.push({input : textSumB, left : 800, top : 490});



    for(let i = 0; i <= 1; ++i){
        let hold_image = null;
        try{
            hold_image = await fetch(user_imgs[i], {
                method : "GET",
            });
        }catch(err){
            console.log("Issue grabbing users profiles, retrying in 5 seconds: " + err);
            
        }

        if((hold_image == null) || !(hold_image.ok)){
            await sleep(1000);
            console.log("Issue fetching image of a user.");
            continue;
        }
        const resp = await hold_image.arrayBuffer();
        const result = Buffer.from(resp);

        if(i == 0){
            composites.push({input : result, left : 1113, top : 100});

        }
        else{
            composites.push({input : result, left : 1113, top : 430});

        }
    }

    

    return [await sharp(resize_Main).composite(composites).png().toBuffer(), [sumA, sumB]];
}

