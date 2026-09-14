sub init()
    m.infoLabel = m.top.findNode("infoLabel")
    m.top.setFocus(true)
end sub

sub onMacChange()
    m.infoLabel.text = "Dispositivo: " + m.top.mac
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
