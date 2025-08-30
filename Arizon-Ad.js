import config from "./config.json" with {type : "json"};
import {Client, Events, GatewayIntentBits, WebhookClient} from "discord.js";
import "dotenv/config";
import fs from "fs";






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

async function send_inbound(){



    const inbounds = await fetch("https://trades.roblox.com/v1/trades/inbound?limit=10", {
        method : "GET",

        headers : {
            "Cookie" : ".ROBLOSECURITY=" + config.RobloxSecurity
        }
        });
        const hold = await inbounds.json();

        console.log(hold.data[0]);



        console.log(prev_id);

        console.log(hold.data[0].id);


        if(prev_id == hold.data[0].id){

            const inbound_detail = await fetch("https://trades.roblox.com/v2/trades/" + hold.data[0].id, {
                method : "GET",

                headers : {
                    "Cookie" : ".ROBLOSECURITY=" + config.RobloxSecurity
                }
            });

            const hold_details = await inbound_detail.json();


            console.log(hold_details);


            await hook.send({
            username: hold_details.participantAOffer.user.displayName,
            avatarURL: "https://example.com/avatar.png",
            embeds: [
                {
                title: "NEW TRADE INBOUND BY: " + hold_details.participantBOffer.user.displayName,
                url: "https://www.roblox.com/trades?tab=Inbound",
                description: "All tests passed.",
                color: 0x00B894,                    // integer RGB (hex allowed)
                timestamp: new Date().toISOString(),// shows a small time next to footer
                author: {
                    name: "CI Runner",
                    url: "https://example.com",
                    icon_url: "https://example.com/ci.png"
                },
                thumbnail: { url: "https://example.com/thumb.png" },
                image:     { url: "https://example.com/large.png" },
                fields: [
                    { name: "Commit", value: "`abc123`", inline: true },
                    { name: "Duration", value: "2m 14s", inline: true },
                    { name: "Env", value: "prod", inline: true }
                ],
                footer: {
                    text: "Powered by MyBot • v1.2.3",
                    icon_url: "https://example.com/footer-icon.png"
                }
                }
            ]
            });

            retrieveANDsaveID(hold.data[0].id);
        }


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


    if(!(await check_roli_exists())){
        return;
    }

    run_send_ad();

    //send_inbound();


}



main();
