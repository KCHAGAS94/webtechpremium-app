sub init()
    m.statusLabel = m.top.findNode("statusLabel")
    m.expiryLabel = m.top.findNode("expiryLabel")
    m.menu = m.top.findNode("menu")

    m.cardFill = "0x1C1A4AFF"
    m.cardFillSelected = "0x2A2870FF"
    m.borderSelected = "0x22E5FFFF"
    m.borderIdle = "0x00000000"

    BuildMenu()

    m.selectedIndex = 0
    m.top.setFocus(true)
    LoadCatalog()
end sub

sub BuildMenu()
    ' Layout mirrors the mobile app's home screen: a tall "TV ao Vivo" tile,
    ' a 2x2 grid (Filmes/Series/Conta/Recarregar) and a narrow settings column.
    m.menuData = [
        { x: 0, y: 0, w: 340, h: 380, label: "TV ao Vivo", kind: "live", left: 0, right: 1, up: 0, down: 0 }
        { x: 380, y: 0, w: 300, h: 180, label: "Filmes", kind: "vod", left: 0, right: 2, up: 1, down: 3 }
        { x: 700, y: 0, w: 300, h: 180, label: "Séries", kind: "series", left: 1, right: 5, up: 2, down: 4 }
        { x: 380, y: 200, w: 300, h: 180, label: "Conta", kind: "account", left: 0, right: 4, up: 1, down: 3 }
        { x: 700, y: 200, w: 300, h: 180, label: "Mudar lista de reprodução", kind: "reload", left: 3, right: 6, up: 2, down: 4 }
        { x: 1020, y: 0, w: 260, h: 110, label: "Configurações", kind: "settings", left: 2, right: 5, up: 5, down: 6 }
        { x: 1020, y: 135, w: 260, h: 110, label: "Recarregar", kind: "reload", left: 4, right: 6, up: 5, down: 7 }
        { x: 1020, y: 270, w: 260, h: 110, label: "Sair", kind: "exit", left: 4, right: 7, up: 6, down: 7 }
    ]

    for each data in m.menuData
        card = CreateObject("roSGNode", "Group")
        card.translation = [data.x, data.y]

        border = CreateObject("roSGNode", "Rectangle")
        border.width = data.w
        border.height = data.h
        border.color = m.borderIdle
        card.appendChild(border)

        fill = CreateObject("roSGNode", "Rectangle")
        fill.translation = [4, 4]
        fill.width = data.w - 8
        fill.height = data.h - 8
        fill.color = m.cardFill
        card.appendChild(fill)

        label = CreateObject("roSGNode", "Label")
        label.text = data.label
        label.width = data.w - 24
        label.height = data.h
        label.translation = [12, 0]
        label.horizAlign = "center"
        label.vertAlign = "center"
        label.wrap = true
        if Len(data.label) > 16
            label.font = "font:SmallSystemFont"
        else if data.w < 300
            label.font = "font:MediumSystemFont"
        else
            label.font = "font:LargeSystemFont"
        end if
        label.color = "0xFFFFFFFF"
        card.appendChild(label)

        data.border = border
        m.menu.appendChild(card)
    end for
end sub

sub LoadCatalog()
    mac = GetDeviceMac()

    m.task = CreateObject("roSGNode", "NetworkTask")
    m.task.observeField("status", "onStatus")
    m.task.observeField("catalog", "onCatalog")
    m.task.mac = mac
    m.task.control = "RUN"
end sub

' GetWifiMacAddress/GetEthernetMacAddress aren't implemented on every
' simulator/device (e.g. brs-engine), so fall back to whatever identifier
' roDeviceInfo does support rather than crashing the app.
function GetDeviceMac() as string
    deviceInfo = CreateObject("roDeviceInfo")
    mac = ""

    try
        mac = deviceInfo.GetWifiMacAddress()
    catch e
    end try
    if mac <> invalid and mac <> "" then return FormatMac(mac)

    try
        mac = deviceInfo.GetEthernetMacAddress()
    catch e
    end try
    if mac <> invalid and mac <> "" then return FormatMac(mac)

    try
        mac = deviceInfo.GetDeviceUniqueId()
    catch e
    end try
    if mac <> invalid and mac <> "" then return FormatMac(mac)

    return "00:00:00:00:00:00"
end function

' Normalizes a raw MAC/id (with or without separators) to the
' "aa:bb:cc:dd:ee:ff" format used in the painel's device records.
function FormatMac(raw as string) as string
    hex = ""
    for i = 0 to Len(raw) - 1
        ch = Mid(raw, i + 1, 1)
        if InStr(1, "0123456789abcdefABCDEF", ch) > 0 then hex = hex + ch
    end for

    if Len(hex) <> 12 then return raw

    formatted = ""
    for i = 0 to 5
        pair = Mid(hex, i * 2 + 1, 2)
        if i > 0 then formatted = formatted + ":"
        formatted = formatted + LCase(pair)
    end for
    return formatted
end function

sub onStatus(event as object)
    status = event.GetData()
    nl = Chr(10)
    if status = "no-playlist"
        m.statusLabel.text = "Nenhuma lista vinculada a este dispositivo." + nl + "Fale com seu revendedor para liberar o acesso."
    else if status = "expired"
        m.statusLabel.text = "Sua assinatura expirou." + nl + "Fale com seu revendedor para renovar."
    else if status = "error"
        m.statusLabel.text = "Nao foi possivel carregar sua lista." + nl + "Verifique sua internet e tente novamente."
    end if
end sub

sub onCatalog(event as object)
    m.catalog = event.GetData()
    if m.catalog = invalid
        m.statusLabel.text = "Sua lista nao tem conteudo disponivel no momento."
        return
    end if

    m.statusLabel.visible = false
    m.menu.visible = true
    HighlightMenu()
end sub

sub HighlightMenu()
    for each data in m.menuData
        data.border.color = m.borderIdle
    end for
    m.menuData[m.selectedIndex].border.color = m.borderSelected
end sub

function FindSection(kind as string) as dynamic
    for each child in m.catalog.GetChildren(-1, 0)
        if child.Title = kind then return child
    end for
    return invalid
end function

sub OpenLive()
    section = FindSection("live")
    if section = invalid then return
    page = CreateObject("roSGNode", "LivePage")
    page.content = section
    m.top.appendChild(page)
    page.setFocus(true)
end sub

sub OpenMovies()
    section = FindSection("vod")
    if section = invalid then return
    page = CreateObject("roSGNode", "MoviesPage")
    page.content = section
    m.top.appendChild(page)
    page.setFocus(true)
end sub

sub OpenSeries()
    section = FindSection("series")
    if section = invalid then return
    page = CreateObject("roSGNode", "SeriesPage")
    page.xtBaseUrl = m.catalog.xtBaseUrl
    page.xtUsername = m.catalog.xtUsername
    page.xtPassword = m.catalog.xtPassword
    page.content = section
    m.top.appendChild(page)
    page.setFocus(true)
end sub

sub OpenAccount()
    page = CreateObject("roSGNode", "AccountPage")
    page.mac = GetDeviceMac()
    m.top.appendChild(page)
end sub

sub OpenSettings()
    page = CreateObject("roSGNode", "SettingsPage")
    m.top.appendChild(page)
end sub

sub OnMenuSelect()
    selected = m.menuData[m.selectedIndex]
    if selected.kind = "live"
        OpenLive()
    else if selected.kind = "vod"
        OpenMovies()
    else if selected.kind = "series"
        OpenSeries()
    else if selected.kind = "account"
        OpenAccount()
    else if selected.kind = "settings"
        OpenSettings()
    else if selected.kind = "reload"
        m.statusLabel.text = "Carregando sua lista..."
        m.statusLabel.visible = true
        m.menu.visible = false
        LoadCatalog()
    else if selected.kind = "exit"
        m.top.exitScene = true
    end if
    ' "settings" and "account" are visual-only placeholders for now.
end sub

function onKeyEvent(key as string, press as boolean) as boolean
    if not press or not m.menu.visible then return false

    current = m.menuData[m.selectedIndex]
    if key = "right" and current.right <> m.selectedIndex
        m.selectedIndex = current.right
        HighlightMenu()
        return true
    else if key = "left" and current.left <> m.selectedIndex
        m.selectedIndex = current.left
        HighlightMenu()
        return true
    else if key = "up" and current.up <> m.selectedIndex
        m.selectedIndex = current.up
        HighlightMenu()
        return true
    else if key = "down" and current.down <> m.selectedIndex
        m.selectedIndex = current.down
        HighlightMenu()
        return true
    else if key = "OK"
        OnMenuSelect()
        return true
    end if

    return false
end function
