function decodeXml(value) {
    return String(value || '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');
}

function getXmlText(xml, tagName) {
    const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = String(xml || '').match(new RegExp(`<${escapedTag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`, 'i'));
    return match ? decodeXml(match[1].trim()) : null;
}

function parseDeviceInfo(xml) {
    return {
        model: getXmlText(xml, 'model'),
        firmwareVersion: getXmlText(xml, 'firmwareVersion'),
        firmwareBuild: getXmlText(xml, 'firmwareReleasedDate'),
        deviceType: getXmlText(xml, 'deviceType'),
        subDeviceType: getXmlText(xml, 'subDeviceType'),
        serialNumber: getXmlText(xml, 'serialNumber'),
    };
}

module.exports = { getXmlText, parseDeviceInfo };
