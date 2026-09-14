' Same painel used by mobile/src/config/device.ts — the reseller links M3U/Xtream
' lists to a device MAC there. This app only ever reads by MAC, never writes.
function PanelApiBaseUrl() as string
    return "https://painel.webtechpremium.kchagas.com.br/api"
end function

' Visual identity mirrored from mobile/src/constants/theme.ts (dark palette,
' the app's default) and mobile/app.json's splash config.
function Theme() as object
    return {
        background: "0x000000FF"
        splash: "0x04041AFF"
        card: "0x212225FF"
        selected: "0x2E3135FF"
        text: "0xFFFFFFFF"
        textSecondary: "0xB0B4BAFF"
    }
end function
