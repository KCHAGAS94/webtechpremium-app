sub init()
    m.top.functionName = "executeTask"
end sub

sub executeTask()
    creds = {
        baseUrl: m.top.xtBaseUrl
        username: m.top.xtUsername
        password: m.top.xtPassword
    }

    info = HttpGetJson(XtreamUrl(creds, "get_series_info") + "&series_id=" + m.top.seriesId)
    if info = invalid or info.episodes = invalid
        m.top.status = "error"
        return
    end if

    root = CreateObject("roSGNode", "ContentNode")

    for each seasonNum in info.episodes.Keys()
        season = CreateObject("roSGNode", "ContentNode")
        season.Title = "Temporada " + seasonNum

        for each ep in info.episodes[seasonNum]
            item = CreateObject("roSGNode", "ContentNode")
            epNum = ep.episode_num.ToStr()
            item.Title = epNum + ". " + ep.title
            ext = "mp4"
            if ep.container_extension <> invalid and ep.container_extension <> "" then ext = ep.container_extension
            item.Url = StreamUrl(creds, "series", ep.id, ext)
            season.AppendChild(item)
        end for

        root.AppendChild(season)
    end for

    m.top.episodes = root
    m.top.status = "ok"
end sub
