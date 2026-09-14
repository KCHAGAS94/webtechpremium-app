sub init()
    m.video = m.top.findNode("video")
    m.video.observeField("state", "onStateChange")
end sub

sub onContentChange()
    if m.top.streamUrl = invalid or m.top.streamUrl = "" then return

    content = CreateObject("roSGNode", "ContentNode")
    content.title = m.top.contentTitle
    content.url = m.top.streamUrl
    content.streamFormat = "hls"

    m.video.content = content
    m.video.control = "play"
end sub

sub onStateChange(event as object)
    state = event.GetData()
    if state = "finished" or state = "error"
        Close()
    end if
end sub

sub Close()
    parent = m.top.getParent()
    if parent <> invalid then parent.removeChild(m.top)
end sub

function onKeyEvent(key as string, press as boolean) as boolean
    if not press then return false

    if key = "back"
        Close()
        return true
    else if key = "play" or key = "OK"
        if m.video.state = "playing"
            m.video.control = "pause"
        else
            m.video.control = "resume"
        end if
        return true
    end if

    return false
end function
