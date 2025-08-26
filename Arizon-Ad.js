import config from "./config.json" with {type : "json"};


async function check_roli_exists(){
    const result = await fetch("https://rolimons.com");

    const grab = await result.headers;

    console.log(grab);

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


async function send_ad(){

    let body_send = {"player_id" : config.roblox_id, "offer_item_ids" : config.items_send, "request_item_ids" : config.items_request, "request_tags" : config.tags_send};

    const result = await fetch("https://api.rolimons.com/tradeads/v1/createad", {
        method: 'POST',
        headers: {
            "Content-Type" : "application/json",
            "Cookie" : "_RoliVerification=" + config.RoliVerification,
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

    await sleep(1080000);
    send_ad();
}



async function main(){

    if(!(await check_roli_exists())){
        process.exit();
    }


    send_ad();


}



main();
