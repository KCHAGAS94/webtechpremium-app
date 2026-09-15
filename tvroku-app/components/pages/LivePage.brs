' Visual cap while there is no virtualization/pagination yet — "Tudo" on a
' large provider can have thousands of channels, and building a node per
' item would be too heavy. Revisit once we're back on the logic pass.
function MaxGridItems() as integer
    return 60
end function

sub init()
    m.sidebar = m.top.findNode("sidebar")
    m.itemsGrid = m.top.findNode("itemsGrid")
    m.gridTitle = m.top.findNode("gridTitle")
    m.emptyLabel = m.top.findNode("emptyLabel")
    m.previewPoster = m.top.findNode("previewPoster")
    m.previewTitle = m.top.findNode("previewTitle")

    m.sidebarRowH = 64
    m.gridCols = 4
    m.cardW = 250
    m.cardH = 170
    m.cardSpacing = 20

    m.focusRegion = "sidebar"
    m.sidebarIndex = 0
    m.gridIndex = 0
    m.gridCards = []

    m.top.setFocus(true)
end sub

sub onContentChange()
    BuildCategories()
    BuildSidebar()
    SelectCategory(0)
end sub

sub BuildCategories()
    m.categories = []

    allItems = []
    for each row in m.top.content.GetChildren(-1, 0)
        for each item in row.GetChildren(-1, 0)
            allItems.Push(item)
        end for
    end for

    m.categories.Push({ title: "Tudo", items: allItems })
    m.categories.Push({ title: "Favoritos", items: [] })

    for each row in m.top.content.GetChildren(-1, 0)
        m.categories.Push({ title: row.Title, items: row.GetChildren(-1, 0) })
    end for
end sub

sub BuildSidebar()
    m.sidebar.removeChildren(m.sidebar.GetChildren(-1, 0))
    m.sidebarRows = []

    y = 24
    for each category in m.categories
        row = CreateObject("roSGNode", "Group")
        row.translation = [0, y]

        highlight = CreateObject("roSGNode", "Rectangle")
        highlight.width = 380
        highlight.height = m.sidebarRowH
        highlight.color = "0x00000000"
        row.appendChild(highlight)

        nameLabel = CreateObject("roSGNode", "Label")
        nameLabel.text = category.title
        nameLabel.translation = [24, 18]
        nameLabel.font = "font:MediumSystemFont"
        nameLabel.color = "0xE6E8ECFF"
        row.appendChild(nameLabel)

        countLabel = CreateObject("roSGNode", "Label")
        countLabel.text = category.items.Count().ToStr()
        countLabel.translation = [300, 18]
        countLabel.font = "font:MediumSystemFont"
        countLabel.color = "0x8A8FA3FF"
        row.appendChild(countLabel)

        category.highlight = highlight
        m.sidebarRows.Push(row)
        m.sidebar.appendChild(row)
        y = y + m.sidebarRowH
    end for
end sub

sub HighlightSidebar()
    for each category in m.categories
        category.highlight.color = "0x00000000"
    end for
    m.categories[m.sidebarIndex].highlight.color = "0x1C1A4AFF"
end sub

sub SelectCategory(index as integer)
    m.sidebarIndex = index
    HighlightSidebar()

    category = m.categories[index]
    m.gridTitle.text = category.title
    BuildGrid(category.items)
end sub

sub BuildGrid(items as object)
    m.itemsGrid.removeChildren(m.itemsGrid.GetChildren(-1, 0))
    m.gridCards = []
    m.gridIndex = 0

    if items.Count() = 0
        m.emptyLabel.visible = true
        m.emptyLabel.text = "Nada encontrado por aqui ainda."
        return
    end if
    m.emptyLabel.visible = false

    count = items.Count()
    if count > MaxGridItems() then count = MaxGridItems()

    for i = 0 to count - 1
        item = items[i]
        col = i mod m.gridCols
        row = i \ m.gridCols

        card = CreateObject("roSGNode", "Group")
        card.translation = [col * (m.cardW + m.cardSpacing), row * (m.cardH + m.cardSpacing)]

        border = CreateObject("roSGNode", "Rectangle")
        border.width = m.cardW
        border.height = m.cardH
        border.color = "0x00000000"
        card.appendChild(border)

        poster = CreateObject("roSGNode", "Poster")
        poster.translation = [4, 4]
        poster.width = m.cardW - 8
        poster.height = m.cardH - 46
        poster.loadDisplayMode = "scaleToFit"
        if item.HDPosterUrl <> invalid and item.HDPosterUrl <> "" then poster.uri = item.HDPosterUrl
        card.appendChild(poster)

        label = CreateObject("roSGNode", "Label")
        label.text = item.Title
        label.translation = [8, m.cardH - 38]
        label.width = m.cardW - 16
        label.height = 32
        label.font = "font:SmallSystemFont"
        label.color = "0xE6E8ECFF"
        card.appendChild(label)

        m.gridCards.Push({ node: card, border: border, item: item })
        m.itemsGrid.appendChild(card)
    end for

    HighlightGrid()
end sub

sub HighlightGrid()
    for each card in m.gridCards
        card.border.color = "0x00000000"
    end for
    if m.gridCards.Count() = 0 then return

    current = m.gridCards[m.gridIndex]
    current.border.color = "0x22E5FFFF"
    m.previewTitle.text = current.item.Title
    if current.item.HDPosterUrl <> invalid and current.item.HDPosterUrl <> ""
        m.previewPoster.uri = current.item.HDPosterUrl
    else
        m.previewPoster.uri = ""
    end if
end sub

sub PlayCurrentItem()
    if m.gridCards.Count() = 0 then return
    item = m.gridCards[m.gridIndex].item

    video = CreateObject("roSGNode", "VideoScreen")
    video.contentTitle = item.Title
    video.streamUrl = item.Url
    m.top.appendChild(video)
    video.setFocus(true)
end sub

function onKeyEvent(key as string, press as boolean) as boolean
    if not press then return false

    if key = "back"
        parent = m.top.getParent()
        if parent <> invalid
            parent.removeChild(m.top)
            parent.setFocus(true)
        end if
        return true
    end if

    if m.focusRegion = "sidebar"
        if key = "up" and m.sidebarIndex > 0
            SelectCategory(m.sidebarIndex - 1)
            return true
        else if key = "down" and m.sidebarIndex < m.categories.Count() - 1
            SelectCategory(m.sidebarIndex + 1)
            return true
        else if key = "right" and m.gridCards.Count() > 0
            m.focusRegion = "grid"
            return true
        else if key = "OK" and m.gridCards.Count() > 0
            m.focusRegion = "grid"
            return true
        end if
    else if m.focusRegion = "grid"
        cols = m.gridCols
        total = m.gridCards.Count()

        if key = "left"
            if m.gridIndex mod cols = 0
                m.focusRegion = "sidebar"
            else
                m.gridIndex = m.gridIndex - 1
                HighlightGrid()
            end if
            return true
        else if key = "right" and m.gridIndex < total - 1
            m.gridIndex = m.gridIndex + 1
            HighlightGrid()
            return true
        else if key = "up" and m.gridIndex - cols >= 0
            m.gridIndex = m.gridIndex - cols
            HighlightGrid()
            return true
        else if key = "down" and m.gridIndex + cols < total
            m.gridIndex = m.gridIndex + cols
            HighlightGrid()
            return true
        else if key = "OK"
            PlayCurrentItem()
            return true
        end if
    end if

    return false
end function
