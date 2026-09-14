sub init()
    m.rowList = m.top.findNode("rowList")
    m.emptyLabel = m.top.findNode("emptyLabel")
    m.titleLabel = m.top.findNode("titleLabel")
    m.rowList.observeField("rowItemSelected", "onItemSelected")
    m.mode = "shows"
end sub

sub onContentChange()
    ShowContent(m.top.content, "Series")
end sub

sub ShowContent(content as object, title as string)
    m.titleLabel.text = title
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
    row = m.rowList.content.GetChild(index[0])
    item = row.GetChild(index[1])

    if m.mode = "shows"
        LoadEpisodes(item)
    else
        video = CreateObject("roSGNode", "VideoScreen")
        video.contentTitle = item.Title
        video.streamUrl = item.Url
        m.top.appendChild(video)
        video.setFocus(true)
    end if
end sub

sub LoadEpisodes(show as object)
    m.showTitle = show.Title

    task = CreateObject("roSGNode", "SeriesInfoTask")
    task.observeField("status", "onEpisodesStatus")
    task.observeField("episodes", "onEpisodesReady")
    task.seriesId = show.SeriesId
    task.xtBaseUrl = m.top.xtBaseUrl
    task.xtUsername = m.top.xtUsername
    task.xtPassword = m.top.xtPassword
    task.control = "RUN"
    m.episodesTask = task
end sub

sub onEpisodesStatus(event as object)
    if event.GetData() = "error"
        m.emptyLabel.visible = true
        m.emptyLabel.text = "Nao foi possivel carregar os episodios dessa serie."
    end if
end sub

sub onEpisodesReady(event as object)
    episodes = event.GetData()
    if episodes = invalid or episodes.GetChildCount() = 0 then return

    m.mode = "episodes"
    m.showsContent = m.top.content
    ShowContent(episodes, m.showTitle)
end sub

function onKeyEvent(key as string, press as boolean) as boolean
    if not press then return false

    if key = "back"
        if m.mode = "episodes"
            m.mode = "shows"
            ShowContent(m.showsContent, "Series")
        else
            parent = m.top.getParent()
            if parent <> invalid
                parent.removeChild(m.top)
                parent.setFocus(true)
            end if
        end if
        return true
    end if

    return false
end function
