const getCookie = cookieName => {
  return new Promise((resolve, reject) => {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const pair = cookie.split("=");
      if (pair[0].trim() === cookieName)
        resolve(decodeURIComponent(pair[1]));
    }
    reject("");
  });
}

const createURLParamsString = params => {
  return Object.keys(params).map(key => {
    const value = params[key];
    if (typeof value === "object") return `${key}=${JSON.stringify(value)}`;
    else return `${key}=${value}`;
  }).join("&");
}

const generateURL = (DS_USER_ID, nextPageHash) => {
  const params = {
    query_hash: "3dec7e2c57367ef3da3d987d89f9dbc8", // GraphQL endpoint - WARNING: This key could be changed in the future!
    variables: {
      id: DS_USER_ID, // User's ID from browser cookies
      first: "50"
    }
  };

  if (nextPageHash) params.variables.after = nextPageHash;
  return `https://www.instagram.com/graphql/query/?${createURLParamsString(params)}`;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const startScript = async () => {
  let canQuery = true;
  let nextPageHash = "";
  let totalFollowingCount = 0;
  let currentFollowingCount = 0;
  let requestsCount = 0;
  let unfollowers = [];
  
  do {
    try {
      const DS_USER_ID = await getCookie("ds_user_id");
      const url = generateURL(DS_USER_ID, nextPageHash);
      const { data } = await fetch(url).then(res => res.json());

      canQuery = data.user.edge_follow.page_info.has_next_page;
      nextPageHash = data.user.edge_follow.page_info.end_cursor;
      if (!totalFollowingCount) totalFollowingCount = data.user.edge_follow.count;
      currentFollowingCount += data.user.edge_follow.edges.length;
      requestsCount++;

      data.user.edge_follow.edges.forEach(edge => {
        if (!edge.node.follows_viewer)
          unfollowers.push(edge.node.username);
      });

      console.clear();
      console.log(`%cProgress ${currentFollowingCount}/${totalFollowingCount} (${parseInt(currentFollowingCount / totalFollowingCount * 100)}%)`, "font-size: 1.5rem;");

      await sleep(2000);

      if (requestsCount <= 5) continue;
      requestsCount = 0;

      console.log("%cToo many requests! Waiting 10 seconds before requesting again...", "font-size: 1.5rem;");
      await sleep(10000);
    } catch (error) {
      return console.error(`Something went wrong!\n${error}`);
    }
  } while (canQuery);

  console.clear();

  if (!unfollowers.length) return console.log(`%cProcess finished!\nEveryone followed you back.`, "font-size: 1.5rem;");
  console.log(`%cProcess finished!\n${unfollowers.length} ${unfollowers.length === 1 ? "user" : "users"} didn't follow you back.`, "font-size: 1.5rem;");
  return unfollowers.forEach(unfollower => console.log(unfollower));
}

startScript();