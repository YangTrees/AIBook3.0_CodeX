!macro customInstall
  IfFileExists "$EXEDIR\AIBook-Content\manifest.json" content_found content_missing

  content_missing:
    MessageBox MB_ICONSTOP|MB_OK "没有找到课程资源包。请确认安装程序旁边存在 AIBook-Content 文件夹，然后重新安装。"
    Abort

  content_found:
    CreateDirectory "$INSTDIR\content"
    DetailPrint "正在安装加密课程资源，请耐心等待……"
    nsExec::ExecToStack '"$SYSDIR\robocopy.exe" "$EXEDIR\AIBook-Content" "$INSTDIR\content" /E /R:2 /W:1 /NFL /NDL /NJH /NJS'
    Pop $0
    Pop $1
    IntCmp $0 8 content_copy_ok content_copy_failed content_copy_failed

  content_copy_failed:
    MessageBox MB_ICONSTOP|MB_OK "课程资源复制失败，错误代码：$0。请检查磁盘空间后重试。"
    Abort

  content_copy_ok:
    DetailPrint "课程资源安装完成。"
!macroend
