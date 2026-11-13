const fs = require('fs');
const path = require('path');

function formatXMLTVDate(date) {
  const pad = (n) => (n < 10 ? '0' + n : n);
  const YYYY = date.getUTCFullYear();
  const MM = pad(date.getUTCMonth() + 1);
  const DD = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  return `${YYYY}${MM}${DD}${hh}${mm}${ss} +0000`;
}

const dailySchedule = [
  {
    title: "BLKGuru: Morning Systems",
    desc: "Autonomous market breakdowns, economic literacy, and civic technology analysis.",
    durationMinutes: 120,
    rating: "TV-14",
    category: "News / Finance"
  },
  {
    title: "ZynQ: Digital Twin Showcase",
    desc: "1:1 urban simulation walkthroughs, metaverse spatial modeling, and tech deep dives.",
    durationMinutes: 180,
    rating: "TV-PG",
    category: "Technology"
  },
  {
    title: "QrazyWorQ: Underground Lab",
    desc: "Independent developer spotlights, code reviews, game development, and fighting engine mechanics.",
    durationMinutes: 180,
    rating: "TV-14",
    category: "Gaming / Tech"
  },
  {
    title: "Roast Royce & Culture Vault",
    desc: "High-velocity roast comedy, classic hip-hop vault tracks, and cultural commentary.",
    durationMinutes: 240,
    rating: "TV-MA",
    category: "Comedy / Music"
  },
  {
    title: "Qhemistry (Prime Time)",
    desc: "Flagship 2-hour show featuring Lil Wayne and Juelz Santana. Interactive freestyles, vault tracks, and unfiltered commentary.",
    durationMinutes: 120,
    rating: "TV-MA",
    category: "Music / Talk"
  },
  {
    title: "Channel 420 Night Grid",
    desc: "Overnight continuous ambient beats, gaming audio showcases, and autonomous visual loops.",
    durationMinutes: 600,
    rating: "TV-14",
    category: "Music"
  }
];

function generateEPGXML(daysAhead = 14) {
  const channelId = "channel420.tv";
  const channelName = "Channel 420";

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<tv generator-info-name="Channel420-EPG-Engine" generator-info-url="http://localhost:8080">\n`;
  xml += `  <channel id="${channelId}">\n`;
  xml += `    <display-name>${channelName}</display-name>\n`;
  xml += `    <icon src="https://channel420.tv/assets/logo1024.png"/>\n`;
  xml += `  </channel>\n`;

  let currentTime = new Date();
  currentTime.setUTCHours(0, 0, 0, 0);

  for (let day = 0; day < daysAhead; day++) {
    for (const item of dailySchedule) {
      const startTime = new Date(currentTime.getTime());
      const endTime = new Date(currentTime.getTime() + item.durationMinutes * 60 * 1000);

      xml += `  <programme start="${formatXMLTVDate(startTime)}" stop="${formatXMLTVDate(endTime)}" channel="${channelId}">\n`;
      xml += `    <title lang="en">${escapeXml(item.title)}</title>\n`;
      xml += `    <desc lang="en">${escapeXml(item.desc)}</desc>\n`;
      xml += `    <category lang="en">${escapeXml(item.category)}</category>\n`;
      xml += `    <rating system="VCHIP">\n`;
      xml += `      <value>${item.rating}</value>\n`;
      xml += `    </rating>\n`;
      xml += `  </programme>\n`;

      currentTime = endTime;
    }
  }

  xml += `</tv>`;
  return xml;
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

if (require.main === module) {
  const xmlOutput = generateEPGXML(14);
  const outputPath = path.join(__dirname, 'epg.xml');
  fs.writeFileSync(outputPath, xmlOutput, 'utf8');
  console.log(`[EPG Engine] 14-day XMLTV feed successfully generated at ${outputPath}`);
}

module.exports = { generateEPGXML };
