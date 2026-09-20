Remove-Item package.json -Force -ErrorAction SilentlyContinue
cmd /c "npx -y create-next-app@latest temp-app --typescript --tailwind --eslint --app --src-dir --import-alias `"@/*`" --use-npm"
Copy-Item -Path "temp-app\*" -Destination "." -Recurse -Force
Copy-Item -Path "temp-app\.*" -Destination "." -Recurse -Force
Remove-Item -Path "temp-app" -Recurse -Force
