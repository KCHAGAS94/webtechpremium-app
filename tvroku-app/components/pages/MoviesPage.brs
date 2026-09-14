sub init()
    m.rowList = m.top.findNode("rowList")
    m.emptyLabel = m.top.findNode("emptyLabel")
    m.rowList.observeField("rowItemSelected", "onItemSelected")
end sub

sub onContentChange()
    content = m.top.content
    if content = invalid or content.GetChildCount() = 0
        m.rowList.visible = false
        m.emptyLabel.visible = true
        m.emptyLabel.text = "Nada encontrado por aqui ainda."
        return
    end if

    m.rowList.visible = true
    m.emptyLabel.visible = false
    m.rowList.content = content
    m.rowList.setFocus(true)
end sub

sub onItemSelected(event as object)
    index = event.GetData()
    row = m.top.content.GetChild(index[0])
    item = row.GetChild(index[1])

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

    return false
end function
